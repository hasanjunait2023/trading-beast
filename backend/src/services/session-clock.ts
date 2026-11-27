export const SESSION_NAMES = ['Asian','London','New York'] as const;
export type SessionName = typeof SESSION_NAMES[number];
const definitions = {
  Asian: { zone: 'Asia/Tokyo', hour: 9 },
  London: { zone: 'Europe/London', hour: 8 },
  'New York': { zone: 'America/New_York', hour: 8 }
} as const;
const formatters = new Map<string, Intl.DateTimeFormat>();
function localParts(ts: number, zone: string) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    formatters.set(zone,f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ts*1000)).map(x=>[x.type,Number(x.value)]));
  return {year:p.year,month:p.month,day:p.day,hour:p.hour,minute:p.minute,second:p.second};
}
function localEpoch(year:number,month:number,day:number,hour:number,zone:string):number {
  const target=Date.UTC(year,month-1,day,hour)/1000;
  let guess=target;
  for(let i=0;i<4;i++){
    const p=localParts(guess,zone);
    const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)/1000;
    const delta=target-represented;
    if(delta===0) return guess;
    guess+=delta;
  }
  throw new Error('Unable to resolve session local time');
}
function calendarDay(ts:number,zone:string,offset=0):Date {
  const p=localParts(ts,zone);
  return new Date(Date.UTC(p.year,p.month-1,p.day+offset));
}
function weekday(d:Date){return d.getUTCDay()>=1 && d.getUTCDay()<=5;}
function dateLabel(d:Date){return d.toISOString().slice(0,10);}
function startOn(d:Date,name:SessionName){
  const def=definitions[name];
  return localEpoch(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),def.hour,def.zone);
}
export function isFxWeekOpen(ts:number):boolean {
  const p=localParts(ts,'America/New_York');
  const day=new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay();
  return day===0?p.hour>=17:day===6?false:day===5?p.hour<17:true;
}
export function getSessionWindow(name:SessionName,nowSec:number){
  let previous: {start:number;date:string}|undefined;
  let next:number|undefined;
  for(let offset=-7;offset<=7;offset++){
    const d=calendarDay(nowSec,definitions[name].zone,offset);
    if(!weekday(d)) continue;
    const start=startOn(d,name);
    if(start<=nowSec) previous={start,date:dateLabel(d)};
    else if(next===undefined) next=start;
  }
  if(!previous || next===undefined) throw new Error('Session window not resolved');
  const sessionStartTs=previous.start;
  // Conventional 9-hour local market-analysis window, not broker trading hours.
  const sessionEndTs=sessionStartTs+9*3600;
  const orEndTs=sessionStartTs+3600;
  const fxWeekOpen=isFxWeekOpen(nowSec);
  const active=fxWeekOpen && nowSec>=sessionStartTs && nowSec<sessionEndTs;
  return {session:name,zone:definitions[name].zone,sessionDate:previous.date,
    sessionStartTs,sessionEndTs,orEndTs,nextStartTs:next,
    startHour:localParts(sessionStartTs,'Asia/Dhaka').hour,
    orDone:nowSec>=orEndTs,active,fxWeekOpen};
}
export function detectSessionWindow(nowSec:number){
  return SESSION_NAMES.map(n=>getSessionWindow(n,nowSec)).sort((a,b)=>b.sessionStartTs-a.sessionStartTs)[0];
}
export function sessionOverview(nowSec:number){
  const sessions=SESSION_NAMES.map(n=>getSessionWindow(n,nowSec));
  const active=sessions.filter(s=>s.active).map(s=>s.session);
  return {asOf:new Date(nowSec*1000).toISOString(),fxWeekOpen:isFxWeekOpen(nowSec),
    selected:detectSessionWindow(nowSec).session,active,overlap:active.length>1,sessions,
    calendarPolicy:'standard-week-no-holidays'};
}
