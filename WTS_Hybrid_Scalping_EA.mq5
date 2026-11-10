//+------------------------------------------------------------------+
//| WTS Hybrid Scalping EA                                            |
//| M1 execution / M5 directional context                             |
//| Price action setup: liquidity sweep -> displacement -> retest     |
//| Momentum confirmation: EMA 9/21, RSI, ADX and Vortex              |
//| Risk-based execution with TP1 partial, TP2, BE, trail and timeout |
//+------------------------------------------------------------------+
#property strict
#property version   "1.02"
#property description "WTS Hybrid Scalping EA: restricted Nasdaq, Gold, Oil, S&P 500 and Bitcoin universe."

#include <Trade/Trade.mqh>
CTrade trade;

//--- Scope and execution
input group "01. Universe and execution"
input ulong  MagicNumber              = 6110401;
input string NasdaqSymbolOverride      = "";      // Exact broker symbol; blank = auto-detect Nasdaq/US100 alias
input string GoldSymbolOverride        = "";      // Exact broker symbol; blank = auto-detect Gold/XAU alias
input string OilSymbolOverride         = "";      // Exact broker symbol; blank = auto-detect Oil/WTI/Brent alias
input string SP500SymbolOverride       = "";      // Exact broker symbol; blank = auto-detect S&P 500 alias
input string BitcoinSymbolOverride     = "";      // Exact broker symbol; blank = auto-detect Bitcoin/BTC alias
input int    ScanIntervalSeconds       = 1;
input int    SlippagePoints            = 20;
input int    MaxSpreadPoints           = 0;       // 0 = disabled; ATR-relative filter remains active
input double MaxSpreadToATR            = 0.15;    // spread must be <= this fraction of M1 ATR
input int    MaxOpenPositions          = 3;       // across all symbols for this magic number
input int    MaxTradesPerDay           = 30;      // unique position identifiers
input int    CooldownMinutes            = 2;       // after a position closes on a symbol
input double MarginUtilizationCap       = 0.90;    // max fraction of free margin a single entry may consume

//--- Signal model
input group "02. Hybrid setup"
input ENUM_TIMEFRAMES ExecutionTF      = PERIOD_M1;
input ENUM_TIMEFRAMES BiasTF           = PERIOD_M5;
input int    SweepLookback             = 12;
input int    SetupExpiryBars           = 5;
input int    ATRPeriod                 = 14;
input double MinDisplacementATR        = 0.65;
input double MinDisplacementBodyPct    = 0.55;
input double RetestToleranceATR        = 0.18;
input double StopBufferATR             = 0.12;
input double MaxStopATR                = 2.50;
input int    FastEMAPeriod              = 9;
input int    SlowEMAPeriod             = 21;
input int    BiasFastEMAPeriod          = 20;
input int    BiasSlowEMAPeriod          = 50;
input int    RSIPeriod                  = 14;
input double LongRSIMin                 = 52.0;
input double ShortRSIMax                = 48.0;
input int    ADXPeriod                  = 14;
input double MinADX                    = 14.0;
input int    VortexPeriod               = 14;
input bool   RequireADXExpansion        = false;   // optional: ADX[1] > ADX[2]

//--- Risk and trade management
input group "03. Risk and targets"
input double RiskPercent                = 1.0;
input double TP1_R                      = 0.80;
input double TP1_ClosePercent           = 50.0;
input double TP2_R                      = 1.50;
input double BreakEvenOffsetPoints      = 2.0;
input bool   EnableATRTrailing           = true;
input double TrailStart_R               = 1.00;
input double TrailATRMultiplier         = 0.80;
input int    MaxHoldMinutes              = 20;
input bool   ExitOnMomentumFlip          = true;

//--- Account protection
input group "04. Protection"
input double DailyLossLimitPercent       = 5.0;
input int    MaxConsecutiveLosses        = 3;
input bool   ClosePositionsAtDailyLimit  = true;

//--- Runtime state
struct SymbolEngine
  {
   string   symbol;
   int      hFastEMA;
   int      hSlowEMA;
   int      hRSI;
   int      hADX;
   int      hATR;
   int      hBiasFastEMA;
   int      hBiasSlowEMA;
   datetime lastBarTime;
   datetime lastExitTime;
   bool     setupActive;
   int      setupDirection;       // 1 buy, -1 sell
   double   setupLevel;
   double   setupExtreme;
   int      setupAge;
  };

struct ClosedPosition
  {
   ulong    identifier;
   datetime closeTime;
  };

SymbolEngine Engines[];
int          EngineCount=0;
datetime     LastLossScan=0;
int          CachedConsecutiveLosses=0;
bool         DailyLock=false;
datetime     CurrentDayStart=0;
string       GVPrefix="";

//+------------------------------------------------------------------+
//| Small helpers                                                     |
//+------------------------------------------------------------------+
string RiskKey(const ulong identifier)
  {
   return GVPrefix+"R_"+(string)identifier;
  }
string TP1Key(const ulong identifier)
  {
   return GVPrefix+"P1_"+(string)identifier;
  }
string DailyEquityKey(const datetime dayStart)
  {
   MqlDateTime d; TimeToStruct(dayStart,d);
   return "WTS_DD_"+(string)MagicNumber+"_"+(string)d.year+"_"+(string)d.mon+"_"+(string)d.day;
  }
string DailyLockKey(const datetime dayStart)
  {
   MqlDateTime d; TimeToStruct(dayStart,d);
   return "WTS_LOCK_"+(string)MagicNumber+"_"+(string)d.year+"_"+(string)d.mon+"_"+(string)d.day;
  }

int VolumeDigits(const double step)
  {
   int digits=0;
   double v=step;
   while(digits<8 && MathAbs(v-MathRound(v))>1e-8)
     { v*=10.0; digits++; }
   return digits;
  }

double NormalizeVolumeDown(const string symbol,const double requested)
  {
   double step=SymbolInfoDouble(symbol,SYMBOL_VOLUME_STEP);
   double minv=SymbolInfoDouble(symbol,SYMBOL_VOLUME_MIN);
   double maxv=SymbolInfoDouble(symbol,SYMBOL_VOLUME_MAX);
   if(step<=0.0 || minv<=0.0 || maxv<=0.0) return 0.0;
   double v=MathFloor((requested+1e-12)/step)*step;
   v=MathMin(v,maxv);
   v=NormalizeDouble(v,VolumeDigits(step));
   if(v<minv-1e-10) return 0.0;
   return v;
  }

double NormalizePriceDirectional(const string symbol,const double price,const bool roundUp)
  {
   double tick=SymbolInfoDouble(symbol,SYMBOL_TRADE_TICK_SIZE);
   int digits=(int)SymbolInfoInteger(symbol,SYMBOL_DIGITS);
   if(tick>0.0)
     {
      double units=price/tick;
      double aligned=(roundUp ? MathCeil(units-1e-10) : MathFloor(units+1e-10))*tick;
      return NormalizeDouble(aligned,digits);
     }
   return NormalizeDouble(price,digits);
  }

bool IsHedgingAccount()
  {
   return ((ENUM_ACCOUNT_MARGIN_MODE)AccountInfoInteger(ACCOUNT_MARGIN_MODE)==ACCOUNT_MARGIN_MODE_RETAIL_HEDGING);
  }

bool TradeResultAccepted(const bool requestSent)
  {
   if(!requestSent) return false;
   uint rc=trade.ResultRetcode();
   return (rc==TRADE_RETCODE_DONE || rc==TRADE_RETCODE_DONE_PARTIAL ||
           rc==TRADE_RETCODE_NO_CHANGES);
  }

int FindEngine(const string symbol)
  {
   for(int i=0;i<EngineCount;i++) if(Engines[i].symbol==symbol) return i;
   return -1;
  }

void ClearSetup(const int index)
  {
   if(index<0 || index>=EngineCount) return;
   Engines[index].setupActive=false;
   Engines[index].setupDirection=0;
   Engines[index].setupLevel=0.0;
   Engines[index].setupExtreme=0.0;
   Engines[index].setupAge=0;
  }

void ReleaseEngine(const int index)
  {
   if(index<0 || index>=EngineCount) return;
   if(Engines[index].hFastEMA!=INVALID_HANDLE) IndicatorRelease(Engines[index].hFastEMA);
   if(Engines[index].hSlowEMA!=INVALID_HANDLE) IndicatorRelease(Engines[index].hSlowEMA);
   if(Engines[index].hRSI!=INVALID_HANDLE) IndicatorRelease(Engines[index].hRSI);
   if(Engines[index].hADX!=INVALID_HANDLE) IndicatorRelease(Engines[index].hADX);
   if(Engines[index].hATR!=INVALID_HANDLE) IndicatorRelease(Engines[index].hATR);
   if(Engines[index].hBiasFastEMA!=INVALID_HANDLE) IndicatorRelease(Engines[index].hBiasFastEMA);
   if(Engines[index].hBiasSlowEMA!=INVALID_HANDLE) IndicatorRelease(Engines[index].hBiasSlowEMA);
  }

string NormalizeBrokerSymbol(const string symbol)
  {
   string value=symbol;
   StringToUpper(value);
   StringReplace(value,".","");
   StringReplace(value,"_","");
   StringReplace(value,"-","");
   StringReplace(value," ","");
   StringReplace(value,"/","");
   StringReplace(value,"\\","");
   StringReplace(value,"#","");
   StringReplace(value,"&","");
   StringReplace(value,":","");
   return value;
  }

int InstrumentAliasScore(const string brokerSymbol,const int category)
  {
   string aliases[];
   if(category==0) // Nasdaq 100 / US Tech 100
     {
      ArrayResize(aliases,7);
      aliases[0]="NAS100"; aliases[1]="NASDAQ"; aliases[2]="US100";
      aliases[3]="USTEC"; aliases[4]="NQ100"; aliases[5]="TECH100"; aliases[6]="USTECH";
     }
   else if(category==1) // Gold
     {
      ArrayResize(aliases,3);
      aliases[0]="XAUUSD"; aliases[1]="GOLD"; aliases[2]="XAU";
     }
   else if(category==2) // Oil: prefer common US crude aliases, then Brent
     {
      ArrayResize(aliases,8);
      aliases[0]="USOIL"; aliases[1]="XTIUSD"; aliases[2]="WTI";
      aliases[3]="USCRUDE"; aliases[4]="CRUDEOIL"; aliases[5]="UKOIL";
      aliases[6]="XBRUSD"; aliases[7]="BRENT";
     }
   else if(category==3) // S&P 500
     {
      ArrayResize(aliases,6);
      aliases[0]="SPX500"; aliases[1]="US500"; aliases[2]="SP500";
      aliases[3]="USA500"; aliases[4]="ES500"; aliases[5]="SPX";
     }
   else if(category==4) // Bitcoin
     {
      ArrayResize(aliases,4);
      aliases[0]="BTCUSD"; aliases[1]="BTCUSDT"; aliases[2]="XBTUSD"; aliases[3]="BITCOIN";
     }
   else return -1;

   string normalized=NormalizeBrokerSymbol(brokerSymbol);
   int best=-1;
   int aliasCount=ArraySize(aliases);
   for(int i=0;i<aliasCount;i++)
     {
      if(StringFind(normalized,aliases[i])<0) continue;
      // Alias order sets the preferred instrument family; within the same
      // alias, an exact base name outranks a broker-prefixed/suffixed variant.
      int exactBonus=(normalized==aliases[i] ? 10000 : 0);
      int score=(aliasCount-i)*100000+exactBonus+StringLen(aliases[i]);
      if(score>best) best=score;
     }
   return best;
  }

string ResolveInstrumentSymbol(const string overrideSymbol,const int category,const string categoryName)
  {
   if(StringLen(overrideSymbol)>0)
     {
      if(SymbolSelect(overrideSymbol,true) &&
         SymbolInfoInteger(overrideSymbol,SYMBOL_TRADE_MODE)!=SYMBOL_TRADE_MODE_DISABLED)
        {
         Print("WTS: ",categoryName," symbol explicitly set to ",overrideSymbol);
         return overrideSymbol;
        }
      Print("WTS WARNING: configured ",categoryName," symbol '",overrideSymbol,
            "' is unavailable or not tradeable. This instrument will be skipped. Set the exact broker symbol in the EA inputs.");
      return "";
     }

   string bestSymbol="";
   int bestScore=-1;
   int total=SymbolsTotal(false);
   for(int i=0;i<total;i++)
     {
      string candidate=SymbolName(i,false);
      if(candidate=="") continue;
      int score=InstrumentAliasScore(candidate,category);
      if(score<0) continue;
      if(SymbolInfoInteger(candidate,SYMBOL_TRADE_MODE)==SYMBOL_TRADE_MODE_DISABLED) continue;
      if(score>bestScore)
        {
         bestScore=score;
         bestSymbol=candidate;
        }
     }

   if(bestSymbol=="")
     {
      Print("WTS WARNING: no broker symbol matched ",categoryName,
            ". Set the exact broker symbol in the corresponding EA input if the name is non-standard.");
      return "";
     }
   if(!SymbolSelect(bestSymbol,true))
     {
      Print("WTS WARNING: could not select ",categoryName," symbol ",bestSymbol,". Instrument skipped.");
      return "";
     }
   Print("WTS: auto-detected ",categoryName," as ",bestSymbol);
   return bestSymbol;
  }

bool AddSymbolEngine(const string symbol)
  {
   if(symbol=="") return false;
   if(FindEngine(symbol)>=0) return true; // prevent duplicate category mappings
   if(!SymbolSelect(symbol,true)) return false;
   if(SymbolInfoInteger(symbol,SYMBOL_TRADE_MODE)==SYMBOL_TRADE_MODE_DISABLED) return false;

   SymbolEngine e;
   e.symbol=symbol;
   e.hFastEMA=iMA(symbol,ExecutionTF,FastEMAPeriod,0,MODE_EMA,PRICE_CLOSE);
   e.hSlowEMA=iMA(symbol,ExecutionTF,SlowEMAPeriod,0,MODE_EMA,PRICE_CLOSE);
   e.hRSI=iRSI(symbol,ExecutionTF,RSIPeriod,PRICE_CLOSE);
   e.hADX=iADX(symbol,ExecutionTF,ADXPeriod);
   e.hATR=iATR(symbol,ExecutionTF,ATRPeriod);
   e.hBiasFastEMA=iMA(symbol,BiasTF,BiasFastEMAPeriod,0,MODE_EMA,PRICE_CLOSE);
   e.hBiasSlowEMA=iMA(symbol,BiasTF,BiasSlowEMAPeriod,0,MODE_EMA,PRICE_CLOSE);
   e.lastBarTime=0;
   e.lastExitTime=0;
   e.setupActive=false;
   e.setupDirection=0;
   e.setupLevel=0.0;
   e.setupExtreme=0.0;
   e.setupAge=0;

   if(e.hFastEMA==INVALID_HANDLE || e.hSlowEMA==INVALID_HANDLE || e.hRSI==INVALID_HANDLE ||
      e.hADX==INVALID_HANDLE || e.hATR==INVALID_HANDLE || e.hBiasFastEMA==INVALID_HANDLE ||
      e.hBiasSlowEMA==INVALID_HANDLE)
     {
      if(e.hFastEMA!=INVALID_HANDLE) IndicatorRelease(e.hFastEMA);
      if(e.hSlowEMA!=INVALID_HANDLE) IndicatorRelease(e.hSlowEMA);
      if(e.hRSI!=INVALID_HANDLE) IndicatorRelease(e.hRSI);
      if(e.hADX!=INVALID_HANDLE) IndicatorRelease(e.hADX);
      if(e.hATR!=INVALID_HANDLE) IndicatorRelease(e.hATR);
      if(e.hBiasFastEMA!=INVALID_HANDLE) IndicatorRelease(e.hBiasFastEMA);
      if(e.hBiasSlowEMA!=INVALID_HANDLE) IndicatorRelease(e.hBiasSlowEMA);
      Print("WTS WARNING: indicator initialization failed for ",symbol,". Instrument skipped.");
      return false;
     }

   int newSize=EngineCount+1;
   if(ArrayResize(Engines,newSize)!=newSize)
     {
      IndicatorRelease(e.hFastEMA);
      IndicatorRelease(e.hSlowEMA);
      IndicatorRelease(e.hRSI);
      IndicatorRelease(e.hADX);
      IndicatorRelease(e.hATR);
      IndicatorRelease(e.hBiasFastEMA);
      IndicatorRelease(e.hBiasSlowEMA);
      Print("WTS WARNING: could not allocate symbol engine for ",symbol);
      return false;
     }
   Engines[EngineCount]=e;
   EngineCount++;
   return true;
  }

bool BuildUniverse()
  {
   EngineCount=0;
   ArrayResize(Engines,0);

   // Only these five markets are resolved and initialized. The broker list is
   // inspected to identify names, but all other symbols are left untouched.
   string selected[5];
   selected[0]=ResolveInstrumentSymbol(NasdaqSymbolOverride,0,"Nasdaq");
   selected[1]=ResolveInstrumentSymbol(GoldSymbolOverride,1,"Gold");
   selected[2]=ResolveInstrumentSymbol(OilSymbolOverride,2,"Oil");
   selected[3]=ResolveInstrumentSymbol(SP500SymbolOverride,3,"S&P 500");
   selected[4]=ResolveInstrumentSymbol(BitcoinSymbolOverride,4,"Bitcoin");

   for(int i=0;i<ArraySize(selected);i++)
      if(selected[i]!="") AddSymbolEngine(selected[i]);

   Print("WTS: restricted trading universe contains ",EngineCount," selected symbol(s):");
   for(int i=0;i<EngineCount;i++) Print("WTS: allowed symbol [",i+1,"] ",Engines[i].symbol);
   return (EngineCount>0);
  }
//+------------------------------------------------------------------+
//| Time, history and protection                                      |
//+------------------------------------------------------------------+
datetime ServerDayStart()
  {
   datetime now=TimeTradeServer();
   if(now<=0) now=TimeCurrent();
   MqlDateTime d; TimeToStruct(now,d);
   d.hour=0; d.min=0; d.sec=0;
   return StructToTime(d);
  }

void EnsureDailyBaseline()
  {
   datetime day=ServerDayStart();
   if(day<=0) return;
   CurrentDayStart=day;
   string key=DailyEquityKey(day);
   if(!GlobalVariableCheck(key)) GlobalVariableSet(key,AccountInfoDouble(ACCOUNT_EQUITY));
   string lockKey=DailyLockKey(day);
   DailyLock=(GlobalVariableCheck(lockKey) && GlobalVariableGet(lockKey)>0.5);
  }

bool IsIdentifierOpen(const ulong identifier)
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0) continue;
      if((ulong)PositionGetInteger(POSITION_IDENTIFIER)==identifier) return true;
     }
   return false;
  }

int CountOpenPositions()
  {
   int count=0;
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC)==MagicNumber) count++;
     }
   return count;
  }

bool HasEAPositionForSymbol(const string symbol)
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)==symbol && (ulong)PositionGetInteger(POSITION_MAGIC)==MagicNumber)
         return true;
     }
   return false;
  }

bool HasAnyPositionForSymbol(const string symbol)
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)==symbol) return true;
     }
   return false;
  }

int CountTradesToday()
  {
   if(!HistorySelect(CurrentDayStart,TimeTradeServer())) return 0;
   ulong ids[];
   int count=0;
   int deals=HistoryDealsTotal();
   for(int i=0;i<deals;i++)
     {
      ulong deal=HistoryDealGetTicket(i);
      if(deal==0) continue;
      if((ulong)HistoryDealGetInteger(deal,DEAL_MAGIC)!=MagicNumber) continue;
      ENUM_DEAL_ENTRY entry=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal,DEAL_ENTRY);
      if(entry!=DEAL_ENTRY_IN && entry!=DEAL_ENTRY_INOUT) continue;
      ulong id=(ulong)HistoryDealGetInteger(deal,DEAL_POSITION_ID);
      if(id==0) continue;
      bool found=false;
      for(int j=0;j<count;j++) if(ids[j]==id) { found=true; break; }
      if(!found)
        {
         ArrayResize(ids,count+1);
         ids[count]=id;
         count++;
        }
     }
   return count;
  }

int ConsecutiveLossCount()
  {
   datetime now=TimeTradeServer();
   if(LastLossScan>0 && now-LastLossScan<15) return CachedConsecutiveLosses;
   LastLossScan=now;
   CachedConsecutiveLosses=0;
   if(!HistorySelect(0,now)) return 0;

   ClosedPosition closed[];
   int n=0;
   int deals=HistoryDealsTotal();
   for(int i=0;i<deals;i++)
     {
      ulong deal=HistoryDealGetTicket(i);
      if(deal==0 || (ulong)HistoryDealGetInteger(deal,DEAL_MAGIC)!=MagicNumber) continue;
      ENUM_DEAL_ENTRY entry=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal,DEAL_ENTRY);
      if(entry!=DEAL_ENTRY_OUT && entry!=DEAL_ENTRY_OUT_BY && entry!=DEAL_ENTRY_INOUT) continue;
      ulong id=(ulong)HistoryDealGetInteger(deal,DEAL_POSITION_ID);
      if(id==0) continue;
      datetime closeTime=(datetime)HistoryDealGetInteger(deal,DEAL_TIME);
      int found=-1;
      for(int j=0;j<n;j++) if(closed[j].identifier==id) { found=j; break; }
      if(found<0)
        {
         ArrayResize(closed,n+1);
         closed[n].identifier=id;
         closed[n].closeTime=closeTime;
         n++;
        }
      else if(closeTime>closed[found].closeTime) closed[found].closeTime=closeTime;
     }

   // Sort most recently closed position first.
   for(int a=0;a<n-1;a++)
      for(int b=a+1;b<n;b++)
         if(closed[b].closeTime>closed[a].closeTime)
           { ClosedPosition tmp=closed[a]; closed[a]=closed[b]; closed[b]=tmp; }

   for(int c=0;c<n;c++)
     {
      if(IsIdentifierOpen(closed[c].identifier)) continue;
      double net=0.0;
      for(int k=0;k<deals;k++)
        {
         ulong deal=HistoryDealGetTicket(k);
         if(deal==0) continue;
         if((ulong)HistoryDealGetInteger(deal,DEAL_MAGIC)!=MagicNumber) continue;
         if((ulong)HistoryDealGetInteger(deal,DEAL_POSITION_ID)!=closed[c].identifier) continue;
         net+=HistoryDealGetDouble(deal,DEAL_PROFIT);
         net+=HistoryDealGetDouble(deal,DEAL_COMMISSION);
         net+=HistoryDealGetDouble(deal,DEAL_SWAP);
         net+=HistoryDealGetDouble(deal,DEAL_FEE);
        }
      if(net< -0.0000001) CachedConsecutiveLosses++;
      else break;
      if(CachedConsecutiveLosses>=MaxConsecutiveLosses) break;
     }
   return CachedConsecutiveLosses;
  }

bool DailyLossReached()
  {
   if(DailyLossLimitPercent<=0.0) return false;
   string key=DailyEquityKey(CurrentDayStart);
   if(!GlobalVariableCheck(key)) return false;
   double baseline=GlobalVariableGet(key);
   if(baseline<=0.0) return false;
   double dd=(baseline-AccountInfoDouble(ACCOUNT_EQUITY))/baseline*100.0;
   return (dd>=DailyLossLimitPercent);
  }

void CloseAllEAPositions()
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0 || (ulong)PositionGetInteger(POSITION_MAGIC)!=MagicNumber) continue;
      string symbol=PositionGetString(POSITION_SYMBOL);
      trade.SetTypeFillingBySymbol(symbol);
      trade.SetDeviationInPoints(SlippagePoints);
      bool sent=false;
      if(IsHedgingAccount()) sent=trade.PositionClose(ticket);
      else sent=trade.PositionClose(symbol);
      if(!TradeResultAccepted(sent)) Print("WTS: failed to close position ",ticket," on ",symbol,". ",trade.ResultRetcodeDescription());
     }
  }

bool TradingAllowed()
  {
   if(DailyLock) return false;
   if(DailyLossReached())
     {
      DailyLock=true;
      GlobalVariableSet(DailyLockKey(CurrentDayStart),1.0);
      Print("WTS: daily equity loss limit reached. New entries locked for today.");
      if(ClosePositionsAtDailyLimit) CloseAllEAPositions();
      return false;
     }
   if(MaxConsecutiveLosses>0 && ConsecutiveLossCount()>=MaxConsecutiveLosses)
      return false;
   if(MaxTradesPerDay>0 && CountTradesToday()>=MaxTradesPerDay)
      return false;
   if(CountOpenPositions()>=MaxOpenPositions) return false;
   return true;
  }

//+------------------------------------------------------------------+
//| Indicator and setup calculations                                 |
//+------------------------------------------------------------------+
bool CopySeries(const int handle,const int buffer,const int count,double &values[])
  {
   ArrayResize(values,count);
   ArraySetAsSeries(values,true);
   return (CopyBuffer(handle,buffer,0,count,values)==count);
  }

int GetBiasDirection(const int index)
  {
   double fast[],slow[];
   if(!CopySeries(Engines[index].hBiasFastEMA,0,3,fast)) return 0;
   if(!CopySeries(Engines[index].hBiasSlowEMA,0,3,slow)) return 0;
   if(fast[1]>slow[1]) return 1;
   if(fast[1]<slow[1]) return -1;
   return 0;
  }

bool CalculateVortex(MqlRates &rates[],const int period,double &plusVI,double &minusVI)
  {
   if(ArraySize(rates)<period+3) return false;
   double sumTR=0.0,sumPlus=0.0,sumMinus=0.0;
   for(int i=1;i<=period;i++)
     {
      double tr1=rates[i].high-rates[i].low;
      double tr2=MathAbs(rates[i].high-rates[i+1].close);
      double tr3=MathAbs(rates[i].low-rates[i+1].close);
      double tr=MathMax(tr1,MathMax(tr2,tr3));
      sumTR+=tr;
      sumPlus+=MathAbs(rates[i].high-rates[i+1].low);
      sumMinus+=MathAbs(rates[i].low-rates[i+1].high);
     }
   if(sumTR<=0.0) return false;
   plusVI=sumPlus/sumTR;
   minusVI=sumMinus/sumTR;
   return true;
  }

bool MomentumConfirms(const int index,const int direction,MqlRates &rates[])
  {
   double fast[],slow[],rsi[],adx[];
   if(!CopySeries(Engines[index].hFastEMA,0,3,fast)) return false;
   if(!CopySeries(Engines[index].hSlowEMA,0,3,slow)) return false;
   if(!CopySeries(Engines[index].hRSI,0,3,rsi)) return false;
   if(!CopySeries(Engines[index].hADX,0,3,adx)) return false;
   double viPlus=0.0,viMinus=0.0;
   if(!CalculateVortex(rates,VortexPeriod,viPlus,viMinus)) return false;
   if(RequireADXExpansion && adx[1]<=adx[2]) return false;
   if(adx[1]<MinADX) return false;
   if(direction>0)
      return (fast[1]>slow[1] && rsi[1]>=LongRSIMin && viPlus>viMinus);
   return (fast[1]<slow[1] && rsi[1]<=ShortRSIMax && viMinus>viPlus);
  }

bool GetMarketData(const int index,MqlRates &rates[],double &atrValue)
  {
   int need=(int)MathMax((double)(SweepLookback+4),(double)(VortexPeriod+4));
   ArrayResize(rates,need);
   ArraySetAsSeries(rates,true);
   if(CopyRates(Engines[index].symbol,ExecutionTF,0,need,rates)<need) return false;
   double atr[];
   if(!CopySeries(Engines[index].hATR,0,3,atr)) return false;
   atrValue=atr[1];
   return (atrValue>0.0);
  }

bool DetectSweep(const int index,MqlRates &rates[],const double atrValue,int &direction,double &level,double &extreme)
  {
   double priorLow=DBL_MAX;
   double priorHigh=-DBL_MAX;
   for(int i=2;i<=SweepLookback+1;i++)
     {
      priorLow=MathMin(priorLow,rates[i].low);
      priorHigh=MathMax(priorHigh,rates[i].high);
     }
   MqlRates c=rates[1];
   double range=c.high-c.low;
   if(range<=0.0) return false;
   double body=MathAbs(c.close-c.open);
   double bodyPct=body/range;
   int bias=GetBiasDirection(index);
   bool bullish=(c.low<priorLow && c.close>priorLow && c.close>c.open &&
                 body>=atrValue*MinDisplacementATR && bodyPct>=MinDisplacementBodyPct &&
                 (c.close-c.low)/range>=0.70 && bias>0);
   bool bearish=(c.high>priorHigh && c.close<priorHigh && c.close<c.open &&
                 body>=atrValue*MinDisplacementATR && bodyPct>=MinDisplacementBodyPct &&
                 (c.high-c.close)/range>=0.70 && bias<0);
   if(bullish)
     { direction=1; level=priorLow; extreme=c.low; return true; }
   if(bearish)
     { direction=-1; level=priorHigh; extreme=c.high; return true; }
   return false;
  }

bool IsRetestCandle(const int index,MqlRates &rates[],const double atrValue)
  {
   double tolerance=atrValue*RetestToleranceATR;
   double point=SymbolInfoDouble(Engines[index].symbol,SYMBOL_POINT);
   MqlRates c=rates[1];
   double candleRange=MathMax(c.high-c.low,point);
   if(Engines[index].setupDirection>0)
     return (c.low<=Engines[index].setupLevel+tolerance && c.close>Engines[index].setupLevel &&
             c.close>c.open && (c.close-c.low)/candleRange>=0.55);
   return (c.high>=Engines[index].setupLevel-tolerance && c.close<Engines[index].setupLevel &&
           c.close<c.open && (c.high-c.close)/candleRange>=0.55);
  }

bool SpreadAcceptable(const string symbol,const double atrValue)
  {
   MqlTick tick;
   if(!SymbolInfoTick(symbol,tick) || tick.ask<=tick.bid) return false;
   double point=SymbolInfoDouble(symbol,SYMBOL_POINT);
   if(point<=0.0 || atrValue<=0.0) return false;
   double spreadPoints=(tick.ask-tick.bid)/point;
   if(MaxSpreadPoints>0 && spreadPoints>MaxSpreadPoints) return false;
   double atrPoints=atrValue/point;
   if(atrPoints<=0.0 || spreadPoints/atrPoints>MaxSpreadToATR) return false;
   return true;
  }

//+------------------------------------------------------------------+
//| Position sizing and order placement                              |
//+------------------------------------------------------------------+
double CalculateRiskVolume(const string symbol,const ENUM_ORDER_TYPE orderType,const double entry,const double sl)
  {
   double equity=AccountInfoDouble(ACCOUNT_EQUITY);
   double riskMoney=equity*RiskPercent/100.0;
   if(riskMoney<=0.0) return 0.0;

   // Primary: broker-accurate loss per lot via OrderCalcProfit.
   double lossPerLot=0.0;
   double oneLotResult=0.0;
   if(OrderCalcProfit(orderType,symbol,1.0,entry,sl,oneLotResult))
      lossPerLot=MathAbs(oneLotResult);

   // Fallback: tick-value sizing. Some brokers return false from
   // OrderCalcProfit on CFDs/crypto; without this the symbol would never trade.
   if(lossPerLot<=0.0)
     {
      double tickValue=SymbolInfoDouble(symbol,SYMBOL_TRADE_TICK_VALUE);
      double tickSize =SymbolInfoDouble(symbol,SYMBOL_TRADE_TICK_SIZE);
      double slDistance=MathAbs(entry-sl);
      if(tickValue>0.0 && tickSize>0.0 && slDistance>0.0)
         lossPerLot=slDistance/tickSize*tickValue;
     }
   if(lossPerLot<=0.0)
     {
      Print("WTS: unable to determine risk per lot for ",symbol,". Error ",GetLastError());
      return 0.0;
     }

   double lots=NormalizeVolumeDown(symbol,riskMoney/lossPerLot);
   double minLot=SymbolInfoDouble(symbol,SYMBOL_VOLUME_MIN);
   if(lots<minLot) return 0.0; // never round up and exceed the configured risk

   // Free-margin guard: refuse or scale down an entry that would exceed the
   // configured share of free margin, preventing "no money" rejects.
   double marginNeeded=0.0;
   double freeMargin=AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double cap=MarginUtilizationCap;
   if(cap<=0.0 || cap>1.0) cap=0.90;
   if(OrderCalcMargin(orderType,symbol,lots,entry,marginNeeded) && marginNeeded>0.0)
     {
      double allowed=freeMargin*cap;
      if(marginNeeded>allowed)
        {
         double scaled=lots*allowed/marginNeeded;
         lots=NormalizeVolumeDown(symbol,scaled);
         if(lots<minLot)
           {
            Print("WTS: skipped ",symbol," - insufficient free margin for the minimum lot at the configured risk.");
            return 0.0;
           }
        }
     }
   return lots;
  }

bool FindPositionIdentifier(const string symbol,ulong &identifier)
  {
   identifier=0;
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0) continue;
      if(PositionGetString(POSITION_SYMBOL)!=symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC)!=MagicNumber) continue;
      identifier=(ulong)PositionGetInteger(POSITION_IDENTIFIER);
      return (identifier>0);
     }
   return false;
  }

bool PlaceScalp(const int index,const int direction,const double sweepExtreme,const double atrValue)
  {
   string symbol=Engines[index].symbol;
   if(!TradingAllowed()) return false;
   if(HasEAPositionForSymbol(symbol)) return false;
   // Netting positions are shared per symbol; refuse to merge this EA with a manual/other-EA position.
   if(!IsHedgingAccount() && HasAnyPositionForSymbol(symbol)) return false;
   if(Engines[index].lastExitTime>0 && TimeTradeServer()-Engines[index].lastExitTime<CooldownMinutes*60) return false;
   if(!SpreadAcceptable(symbol,atrValue)) return false;

   long tradeMode=SymbolInfoInteger(symbol,SYMBOL_TRADE_MODE);
   if(tradeMode==SYMBOL_TRADE_MODE_DISABLED || tradeMode==SYMBOL_TRADE_MODE_CLOSEONLY) return false;
   if(direction>0 && tradeMode==SYMBOL_TRADE_MODE_SHORTONLY) return false;
   if(direction<0 && tradeMode==SYMBOL_TRADE_MODE_LONGONLY) return false;

   MqlTick tick;
   if(!SymbolInfoTick(symbol,tick)) return false;
   double point=SymbolInfoDouble(symbol,SYMBOL_POINT);
   if(point<=0.0) return false;
   double minStop=(SymbolInfoInteger(symbol,SYMBOL_TRADE_STOPS_LEVEL)+2)*point;
   double entry=(direction>0 ? tick.ask : tick.bid);
   double sl=(direction>0 ? sweepExtreme-atrValue*StopBufferATR : sweepExtreme+atrValue*StopBufferATR);
   double riskDistance=(direction>0 ? entry-sl : sl-entry);
   if(riskDistance<minStop)
     {
      riskDistance=minStop;
      sl=(direction>0 ? entry-riskDistance : entry+riskDistance);
     }
   if(riskDistance<=0.0 || riskDistance>atrValue*MaxStopATR) return false;
   sl=NormalizePriceDirectional(symbol,sl,direction<0);
   riskDistance=(direction>0 ? entry-sl : sl-entry);
   if(riskDistance<=0.0 || riskDistance>atrValue*MaxStopATR) return false;
   double tp=(direction>0 ? entry+riskDistance*TP2_R : entry-riskDistance*TP2_R);
   tp=NormalizePriceDirectional(symbol,tp,direction>0);

   ENUM_ORDER_TYPE orderType=(direction>0 ? ORDER_TYPE_BUY : ORDER_TYPE_SELL);
   double lots=CalculateRiskVolume(symbol,orderType,entry,sl);
   if(lots<=0.0)
     {
      Print("WTS: skipped ",symbol," because minimum volume would exceed the risk budget or sizing failed.");
      return false;
     }

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   trade.SetTypeFillingBySymbol(symbol);
   bool sent=false;
   if(direction>0) sent=trade.Buy(lots,symbol,0.0,sl,tp,"WTS Hybrid scalp BUY");
   else            sent=trade.Sell(lots,symbol,0.0,sl,tp,"WTS Hybrid scalp SELL");
   uint rc=trade.ResultRetcode();
   if(!sent || (rc!=TRADE_RETCODE_DONE && rc!=TRADE_RETCODE_DONE_PARTIAL && rc!=TRADE_RETCODE_PLACED))
     {
      Print("WTS: order failed for ",symbol,". Retcode ",rc," - ",trade.ResultRetcodeDescription());
      return false;
     }

   ulong identifier=0;
   // ResultDeal -> position identifier is preferred; the position scan is a fallback for delayed history sync.
   ulong deal=trade.ResultDeal();
   if(deal>0 && HistoryDealSelect(deal)) identifier=(ulong)HistoryDealGetInteger(deal,DEAL_POSITION_ID);
   if(identifier==0) FindPositionIdentifier(symbol,identifier);
   if(identifier>0)
     {
      GlobalVariableSet(RiskKey(identifier),riskDistance);
      GlobalVariableSet(TP1Key(identifier),0.0);
     }
   Print("WTS: ",(direction>0 ? "BUY" : "SELL")," opened ",symbol," volume=",DoubleToString(lots,VolumeDigits(SymbolInfoDouble(symbol,SYMBOL_VOLUME_STEP))),
         " risk=",DoubleToString(riskDistance,(int)SymbolInfoInteger(symbol,SYMBOL_DIGITS))," TP2=",DoubleToString(tp,(int)SymbolInfoInteger(symbol,SYMBOL_DIGITS)));
   return true;
  }

//+------------------------------------------------------------------+
//| Position management                                              |
//+------------------------------------------------------------------+
bool ReducePosition(const ulong ticket,const string symbol,const ENUM_POSITION_TYPE type,const double closeVolume)
  {
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   trade.SetTypeFillingBySymbol(symbol);
   bool sent=false;
   if(IsHedgingAccount()) sent=trade.PositionClosePartial(ticket,closeVolume);
   else
     {
      // Netting: an opposite market deal reduces the single net position.
      if(type==POSITION_TYPE_BUY) sent=trade.Sell(closeVolume,symbol,0.0,0.0,0.0,"WTS TP1 reduction");
      else sent=trade.Buy(closeVolume,symbol,0.0,0.0,0.0,"WTS TP1 reduction");
     }
   return TradeResultAccepted(sent);
  }

void ManageOnePosition(const ulong ticket)
  {
   if(ticket==0 || !PositionSelectByTicket(ticket)) return;
   if((ulong)PositionGetInteger(POSITION_MAGIC)!=MagicNumber) return;
   string symbol=PositionGetString(POSITION_SYMBOL);
   ulong identifier=(ulong)PositionGetInteger(POSITION_IDENTIFIER);
   ENUM_POSITION_TYPE type=(ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   double entry=PositionGetDouble(POSITION_PRICE_OPEN);
   double sl=PositionGetDouble(POSITION_SL);
   double tp=PositionGetDouble(POSITION_TP);
   double volume=PositionGetDouble(POSITION_VOLUME);
   datetime opened=(datetime)PositionGetInteger(POSITION_TIME);
   MqlTick tick;
   if(!SymbolInfoTick(symbol,tick)) return;

   double risk=0.0;
   string rKey=RiskKey(identifier);
   if(GlobalVariableCheck(rKey)) risk=GlobalVariableGet(rKey);
   if(risk<=0.0 && tp>0.0 && TP2_R>0.0) risk=MathAbs(tp-entry)/TP2_R;
   if(risk<=0.0 && sl>0.0) risk=MathAbs(entry-sl);
   if(risk<=0.0) return;
   if(!GlobalVariableCheck(rKey)) GlobalVariableSet(rKey,risk);

   string pKey=TP1Key(identifier);
   bool tp1Done=(GlobalVariableCheck(pKey) && GlobalVariableGet(pKey)>0.5);
   if(!tp1Done && sl>0.0)
     {
      // A break-even-or-better SL after restart is evidence TP1 was already processed.
      if((type==POSITION_TYPE_BUY && sl>=entry) || (type==POSITION_TYPE_SELL && sl<=entry))
        { tp1Done=true; GlobalVariableSet(pKey,1.0); }
     }

   double tp1=(type==POSITION_TYPE_BUY ? entry+risk*TP1_R : entry-risk*TP1_R);
   bool hitTP1=(type==POSITION_TYPE_BUY ? tick.bid>=tp1 : tick.ask<=tp1);
   if(!tp1Done && hitTP1)
     {
      double minv=SymbolInfoDouble(symbol,SYMBOL_VOLUME_MIN);
      double closeVol=NormalizeVolumeDown(symbol,volume*TP1_ClosePercent/100.0);
      double remain=volume-closeVol;
      bool closeAll=(closeVol<minv || remain<minv-1e-10);
      bool reduced=false;
      if(closeAll)
        {
         trade.SetTypeFillingBySymbol(symbol);
         bool sent=false;
         if(IsHedgingAccount()) sent=trade.PositionClose(ticket);
         else sent=trade.PositionClose(symbol);
         reduced=TradeResultAccepted(sent);
        }
      else reduced=ReducePosition(ticket,symbol,type,closeVol);

      if(reduced)
        {
         GlobalVariableSet(pKey,1.0);
         if(closeAll) return;
         if(!PositionSelectByTicket(ticket)) return;
         sl=PositionGetDouble(POSITION_SL);
         tp=PositionGetDouble(POSITION_TP);
         double point=SymbolInfoDouble(symbol,SYMBOL_POINT);
         double spread=(tick.ask-tick.bid);
         double offset=spread+BreakEvenOffsetPoints*point;
         double be=(type==POSITION_TYPE_BUY ? entry+offset : entry-offset);
         be=NormalizePriceDirectional(symbol,be,type==POSITION_TYPE_BUY);
         bool improves=(type==POSITION_TYPE_BUY ? (sl==0.0 || be>sl) : (sl==0.0 || be<sl));
         if(improves)
           {
            trade.SetTypeFillingBySymbol(symbol);
            bool modified=trade.PositionModify(ticket,be,tp);
            if(!TradeResultAccepted(modified))
               Print("WTS: TP1 executed but break-even modification failed for ",symbol,". ",trade.ResultRetcodeDescription());
           }
        }
      else Print("WTS: TP1 reduction failed for ",symbol,". ",trade.ResultRetcodeDescription());
      return;
     }

   // Hard maximum holding time keeps the strategy in scalping mode.
   if(MaxHoldMinutes>0 && TimeTradeServer()-opened>=MaxHoldMinutes*60)
     {
      trade.SetTypeFillingBySymbol(symbol);
      bool sent=(IsHedgingAccount() ? trade.PositionClose(ticket) : trade.PositionClose(symbol));
      if(TradeResultAccepted(sent)) { int idx=FindEngine(symbol); if(idx>=0) Engines[idx].lastExitTime=TimeTradeServer(); }
      else Print("WTS: time exit failed for ",symbol,". ",trade.ResultRetcodeDescription());
      return;
     }

   if(!tp1Done || !EnableATRTrailing) return;
   double current=(type==POSITION_TYPE_BUY ? tick.bid : tick.ask);
   double openProfit=(type==POSITION_TYPE_BUY ? current-entry : entry-current);
   if(openProfit<risk*TrailStart_R) return;
   int idx=FindEngine(symbol);
   if(idx<0) return;
   double atr[];
   if(!CopySeries(Engines[idx].hATR,0,2,atr) || atr[1]<=0.0) return;
   double trail=(type==POSITION_TYPE_BUY ? current-atr[1]*TrailATRMultiplier : current+atr[1]*TrailATRMultiplier);
   double point=SymbolInfoDouble(symbol,SYMBOL_POINT);
   double minDistance=(SymbolInfoInteger(symbol,SYMBOL_TRADE_STOPS_LEVEL)+1)*point;
   if(type==POSITION_TYPE_BUY)
     {
      trail=MathMin(trail,tick.bid-minDistance);
      trail=NormalizePriceDirectional(symbol,trail,false);
      if((sl==0.0 || trail>sl) && trail<tick.bid)
        {
         trade.SetTypeFillingBySymbol(symbol);
         bool modified=trade.PositionModify(ticket,trail,tp);
         if(!TradeResultAccepted(modified)) Print("WTS: trailing stop modify failed for ",symbol,". ",trade.ResultRetcodeDescription());
        }
     }
   else
     {
      trail=MathMax(trail,tick.ask+minDistance);
      trail=NormalizePriceDirectional(symbol,trail,true);
      if((sl==0.0 || trail<sl) && trail>tick.ask)
        {
         trade.SetTypeFillingBySymbol(symbol);
         bool modified=trade.PositionModify(ticket,trail,tp);
         if(!TradeResultAccepted(modified)) Print("WTS: trailing stop modify failed for ",symbol,". ",trade.ResultRetcodeDescription());
        }
     }
  }

void ManageAllPositions()
  {
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket>0) ManageOnePosition(ticket);
     }
  }

void CheckMomentumExit(const int index,MqlRates &rates[])
  {
   if(!ExitOnMomentumFlip) return;
   string symbol=Engines[index].symbol;
   for(int i=PositionsTotal()-1;i>=0;i--)
     {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0 || PositionGetString(POSITION_SYMBOL)!=symbol ||
         (ulong)PositionGetInteger(POSITION_MAGIC)!=MagicNumber) continue;
      datetime opened=(datetime)PositionGetInteger(POSITION_TIME);
      if(TimeTradeServer()-opened<120) continue;
      ENUM_POSITION_TYPE type=(ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double fast[],slow[],rsi[];
      if(!CopySeries(Engines[index].hFastEMA,0,3,fast) ||
         !CopySeries(Engines[index].hSlowEMA,0,3,slow) ||
         !CopySeries(Engines[index].hRSI,0,3,rsi)) return;
      double viPlus=0.0,viMinus=0.0;
      if(!CalculateVortex(rates,VortexPeriod,viPlus,viMinus)) return;
      bool reverse=(type==POSITION_TYPE_BUY ?
                    (fast[1]<slow[1] && rsi[1]<50.0 && viMinus>viPlus) :
                    (fast[1]>slow[1] && rsi[1]>50.0 && viPlus>viMinus));
      if(reverse)
        {
         trade.SetTypeFillingBySymbol(symbol);
         bool sent=(IsHedgingAccount() ? trade.PositionClose(ticket) : trade.PositionClose(symbol));
         if(TradeResultAccepted(sent)) Engines[index].lastExitTime=TimeTradeServer();
         else Print("WTS: momentum exit failed for ",symbol,". ",trade.ResultRetcodeDescription());
        }
     }
  }

//+------------------------------------------------------------------+
//| Per-symbol state machine                                         |
//+------------------------------------------------------------------+
void ProcessSymbol(const int index)
  {
   MqlRates rates[];
   double atrValue=0.0;
   if(!GetMarketData(index,rates,atrValue)) return;
   datetime currentBar=rates[0].time;
   if(currentBar<=0 || currentBar==Engines[index].lastBarTime) return;
   Engines[index].lastBarTime=currentBar;

   CheckMomentumExit(index,rates);
   if(HasEAPositionForSymbol(Engines[index].symbol))
     {
      ClearSetup(index);
      return;
     }

   if(Engines[index].setupActive)
     {
      Engines[index].setupAge++;
      bool invalid=(Engines[index].setupDirection>0 ?
                    rates[1].close<Engines[index].setupExtreme-atrValue*0.10 :
                    rates[1].close>Engines[index].setupExtreme+atrValue*0.10);
      if(invalid || Engines[index].setupAge>SetupExpiryBars)
         ClearSetup(index);
      else if(IsRetestCandle(index,rates,atrValue))
        {
         int direction=Engines[index].setupDirection;
         double extreme=Engines[index].setupExtreme;
         bool confirmed=(GetBiasDirection(index)==direction && MomentumConfirms(index,direction,rates));
         ClearSetup(index);
         if(confirmed) PlaceScalp(index,direction,extreme,atrValue);
         return;
        }
     }

   if(!Engines[index].setupActive)
     {
      int direction=0;
      double level=0.0,extreme=0.0;
      if(DetectSweep(index,rates,atrValue,direction,level,extreme))
        {
         Engines[index].setupActive=true;
         Engines[index].setupDirection=direction;
         Engines[index].setupLevel=level;
         Engines[index].setupExtreme=extreme;
         Engines[index].setupAge=0;
        }
     }
  }

//+------------------------------------------------------------------+
//| Standard event handlers                                          |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(RiskPercent<=0.0 || RiskPercent>5.0 || TP1_R<=0.0 || TP2_R<=TP1_R ||
      TP1_ClosePercent<=0.0 || TP1_ClosePercent>=100.0 || MaxOpenPositions<1 ||
      ScanIntervalSeconds<1 || SweepLookback<3 || SetupExpiryBars<1 ||
      ATRPeriod<2 || FastEMAPeriod<2 || SlowEMAPeriod<=FastEMAPeriod ||
      BiasFastEMAPeriod<2 || BiasSlowEMAPeriod<=BiasFastEMAPeriod ||
      RSIPeriod<2 || ADXPeriod<2 || VortexPeriod<2 ||
      MinDisplacementATR<=0.0 || MinDisplacementBodyPct<=0.0 || MinDisplacementBodyPct>1.0 ||
      RetestToleranceATR<=0.0 || StopBufferATR<0.0 || MaxSpreadToATR<=0.0 || MaxStopATR<=0.0 ||
      MaxStopATR<=StopBufferATR ||
      CooldownMinutes<0 || MaxHoldMinutes<0 || SlippagePoints<0 || MaxSpreadPoints<0 ||
      BreakEvenOffsetPoints<0.0 || TrailStart_R<=0.0 || TrailATRMultiplier<=0.0 ||
      MarginUtilizationCap<=0.0 || MarginUtilizationCap>1.0 ||
      MaxTradesPerDay<0 || MaxConsecutiveLosses<0)
     {
      Print("WTS: invalid input parameters. Check risk, targets, setup and protection values.");
      return INIT_PARAMETERS_INCORRECT;
     }

   // The hybrid model requires the bias timeframe to be higher (or equal) than
   // the execution timeframe; otherwise the directional context is meaningless.
   if(PeriodSeconds(BiasTF)<PeriodSeconds(ExecutionTF))
     {
      Print("WTS: BiasTF must be greater than or equal to ExecutionTF.");
      return INIT_PARAMETERS_INCORRECT;
     }

   GVPrefix="WTS_HS_"+(string)MagicNumber+"_";
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   EnsureDailyBaseline();
   if(!BuildUniverse())
     {
      Print("WTS: no broker symbols could be initialized.");
      return INIT_FAILED;
     }
   int seconds=(int)MathMax(1.0,(double)ScanIntervalSeconds);
   EventSetTimer(seconds);
   Print("WTS Hybrid Scalping EA initialized. Allowed symbols: ",EngineCount,
         ". Execution TF: ",EnumToString(ExecutionTF),"; bias TF: ",EnumToString(BiasTF),
         ". Account mode: ",(IsHedgingAccount() ? "hedging" : "netting/exchange"),
         ". Risk per trade: ",DoubleToString(RiskPercent,2),"%.");
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   for(int i=0;i<EngineCount;i++) ReleaseEngine(i);
  }

void OnTick()
  {
   ManageAllPositions();
  }

void OnTradeTransaction(const MqlTradeTransaction &trans,const MqlTradeRequest &request,const MqlTradeResult &result)
  {
   if(trans.type!=TRADE_TRANSACTION_DEAL_ADD || trans.deal==0) return;
   if(!HistoryDealSelect(trans.deal)) return;
   if((ulong)HistoryDealGetInteger(trans.deal,DEAL_MAGIC)!=MagicNumber) return;
   ENUM_DEAL_ENTRY entry=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal,DEAL_ENTRY);
   if(entry!=DEAL_ENTRY_OUT && entry!=DEAL_ENTRY_OUT_BY && entry!=DEAL_ENTRY_INOUT) return;
   ulong identifier=(ulong)HistoryDealGetInteger(trans.deal,DEAL_POSITION_ID);
   string symbol=HistoryDealGetString(trans.deal,DEAL_SYMBOL);
   if(identifier==0) return;
   int index=FindEngine(symbol);
   // A partial exit (e.g. TP1) must not start the cooldown or clear setup state;
   // the cooldown is measured from the moment the position is fully closed.
   if(IsIdentifierOpen(identifier)) return;
   if(index>=0)
     {
      Engines[index].lastExitTime=(datetime)HistoryDealGetInteger(trans.deal,DEAL_TIME);
      ClearSetup(index);
     }
   GlobalVariableDel(RiskKey(identifier));
   GlobalVariableDel(TP1Key(identifier));
  }

void OnTimer()
  {
   EnsureDailyBaseline();
   if(DailyLock)
     {
      if(ClosePositionsAtDailyLimit) CloseAllEAPositions();
      ManageAllPositions();
      return;
     }
   if(DailyLossReached())
     {
      DailyLock=true;
      GlobalVariableSet(DailyLockKey(CurrentDayStart),1.0);
      Print("WTS: daily equity loss limit reached. Trading locked until the next server day.");
      if(ClosePositionsAtDailyLimit) CloseAllEAPositions();
      return;
     }
   ManageAllPositions();
   for(int i=0;i<EngineCount;i++) ProcessSymbol(i);
  }
//+------------------------------------------------------------------+
