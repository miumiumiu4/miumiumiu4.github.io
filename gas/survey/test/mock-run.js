// GASのコードを、にせのスプレッドシートで動かして確かめる（node gas/survey/test/mock-run.js）。本物のGoogleには触らない
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const G=require('path').join(__dirname,'..')+'/';
// ---- 表のモック ----
function Sheet(name){this.name=name;this.d=[];}
Sheet.prototype={
 getLastRow(){return this.d.length},getLastColumn(){return Math.max(0,...this.d.map(r=>r.length))},
 appendRow(r){this.d.push(r.slice())},getParent(){return SS},deleteRows(a,n){this.d.splice(a-1,n)},setFrozenRows(){},clearContents(){this.d=[]},
 getDataRange(){return this.getRange(1,1,this.d.length,this.getLastColumn())},
 getRange(r,c,nr=1,nc=1){const s=this;return{
  getValues(){const o=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++){const v=(s.d[r-1+i]||[])[c-1+j];row.push(v===undefined?'':v)}o.push(row)}return o},
  getValue(){return this.getValues()[0][0]},
  setValue(v){this.setValues([[v]])},
  setValues(v){v.forEach((row,i)=>{s.d[r-1+i]=s.d[r-1+i]||[];row.forEach((x,j)=>s.d[r-1+i][c-1+j]=x)})},
  createTextFinder(t){const self=this;const f={matchCase(){return f},matchEntireCell(){return f},
    findAll(){const hits=[];self.getValues().forEach((row,i)=>row.forEach((x,j)=>{if(String(x)===t)hits.push({getRow:()=>r+i})}));return hits},
    findNext(){return f.findAll()[0]||null}};return f}
 }}};
const sheets={};
const SS={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=new Sheet(n))};
const props={HUB_SHEET_ID:'x',SURVEY_SHEET_ID:'x',CAMPAIGN_ID:'c1',DEADLINE:'2099-01-01',LINE_LOGIN_CHANNEL_ID:'123',LINK_SECRET:'sek',BOOKING_SHEET_ID:'x',BOOKING_SHEET_NAME:'予約',WINNERS:'2'};
const cache={};
const ctx={console,JSON,Date,Math,Set,Object,Array,String,Number,Error,
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>k in props?props[k]:null,setProperty:(k,v)=>props[k]=v})},
 SpreadsheetApp:{openById:()=>SS,getActive:()=>({toast:m=>console.log('TOAST',m)})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 ContentService:{createTextOutput:t=>({t,setMimeType(){return this}}),MimeType:{JSON:1}},
 UrlFetchApp:{fetch:(u,o)=>({getResponseCode:()=>o.payload.id_token==='good'?200:400,getContentText:()=>JSON.stringify({sub:'Uabc'})})},
 MailApp:{getRemainingDailyQuota:()=>100,sendEmail:m=>console.log('MAIL to',m.to)},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},
  computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s).digest()].map(b=>b>127?b-256:b),
  computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()],
  base64EncodeWebSafe:b=>Buffer.from(b.map(x=>x&255)).toString('base64url'),
  formatDate:(d)=>d.toISOString().slice(0,10)},
 ScriptApp:{getProjectTriggers:()=>[],newTrigger:()=>({timeBased:()=>({everyHours:()=>({create(){}})})})}};
vm.createContext(ctx);
['Hub.gs','Survey.gs','Admin.gs'].forEach(f=>vm.runInContext(fs.readFileSync(G+f,'utf8'),ctx,{filename:f}));
const post=b=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(b)}}).t);
const base={kind:'survey.submit',campaign:'c1',elapsedSec:120,answers:{pains:['洗濯機のにおい・汚れ','その他：網戸'],top:'夏に子ども部屋のエアコンがカビくさくて困った',action:'あきらめた・後まわしにした'}};
let r;
r=post({...base,email:'Ａ@Example.com ',requestId:'r1'});console.log('1 new', r.ok, r.updated, r.message||'');
r=post({...base,email:'a@example.com',requestId:'r1'});console.log('2 same requestId (cached)', r.updated);
r=post({...base,email:'a@example.com',requestId:'r2',answers:{...base.answers,top:'=HYPERLINK(\"x\")お風呂のカビがとれなくて毎週困っています'}});console.log('3 resubmit same mail -> updated', r.updated);
r=post({...base,email:'b@example.com',idToken:'good',requestId:'r3'});console.log('4 LINE', r.ok);
r=post({...base,email:'b2@example.com',idToken:'good',requestId:'r4'});console.log('5 same LINE new mail -> updated', r.updated);
r=post({...base,email:'c@example.com',idToken:'bad',requestId:'r5'});console.log('6 bad token', r.ok, r.message);
r=post({...base,email:'d@example.com',requestId:'r6',elapsedSec:10,answers:{...base.answers,top:'夏に子ども部屋のエアコンがカビくさくて困った'}});console.log('7 fast+dup', r.ok);
const tok='7.'+ctx.signId_(7);
r=post({...base,email:'e@example.com',m:tok,requestId:'r7',answers:{...base.answers,top:'網戸の張り替えを頼む先が分からずに放置してます'}});
r=post({...base,email:'f@example.com',m:'8.forged',requestId:'r8',answers:{...base.answers,top:'換気扇の油汚れがひどくて自分では無理でした'}});
r=post({...base,email:'g@example.com',requestId:'r9',answers:{...base.answers,top:'短い'}});console.log('9 short', r.ok, r.message);
r=post({...base,email:'not-mail',requestId:'r10'});console.log('10 bad mail', r.ok);
console.log('stats', JSON.stringify(r.stats||ctx.stats_('c1')));
const R=sheets['R_c1'].d; console.log(R[0].join('|'));R.slice(1).forEach(x=>console.log([x[2],x[3],x[4],x[5],x[6],x[7],x[9],x[10],x[11],x[13]].join(' | ')));
console.log('HUB');sheets.customers.d.forEach(x=>console.log(x.slice(0,3).concat(x[5]).join(' | ')));
// 予約と照合（2つの表：見出し1行目の表と、2行目に英語キーがある表。テスト用アドレスは外す）
props.BOOKING_SOURCES=JSON.stringify([
 {name:'キャンペーン',sheetId:'x',tab:'予約',headerRow:1,email:'メール',date:['作業確定日','受付日時'],id:'受付番号'},
 {name:'C000',sheetId:'x',tab:'予約台帳',headerRow:2,email:'email',date:['date'],id:'jobId'},
 {name:'こわれた表',sheetId:'x',tab:'ない',email:'メール'}]);
props.BOOKING_EXCLUDE='owner@example.com';
sheets['予約']=new Sheet('予約');sheets['予約'].d=[['受付番号','受付日時','メール','作業確定日'],['R0701-001','2025/07/01 9:00','A@example.com',''],['R0923-001','2026/09/23 0:02','a@example.com','2026/09/30(水)'],['R0924-001','2026/09/24 1:00','owner@example.com','']];
sheets['予約台帳']=new Sheet('予約台帳');sheets['予約台帳'].d=[['受付番号（自動）','作業日','メール'],['jobId','date','email'],['C000-1',new Date(2026,9,10),'f@example.com'],['C000-2','2026-10-12','a@example.com']];
ctx.hourly();console.log('HUB after link');sheets.customers.d.forEach(x=>console.log([x[1],x[6],x[8]&&x[8].toISOString?x[8].toISOString().slice(0,10):x[8],x[9],x[11]].join(' | ')));
sheets['分析_c1'].d.forEach(x=>console.log('A', x.slice(0,8).join(' | ')));
sheets['照合の記録'].d.forEach(x=>console.log('LOG', x.slice(1).join(' | ')));
// 抽選
props.DEADLINE='2000-01-01';
ctx.drawWinners();
R.slice(1).forEach(x=>{if(x[9]==='要確認')x[9]='有効'});
ctx.drawWinners();
console.log('W', JSON.stringify(sheets['W_c1'].d));
sheets['W_c1'].d[1][5]='GIFT-AAAA';ctx.sendGiftMails();ctx.notifyResults();
ctx.drawWinners();
