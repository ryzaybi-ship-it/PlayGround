(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id), W = canvas.width, H = canvas.height, TILE = 32;
  const creatures = {
    spark:{name:'Іскрик',kind:'spark',color:'#ffc66b',hp:100,avatar:'✦',level:3},
    moss:{name:'Мохлик',kind:'moss',color:'#b8d992',hp:112,avatar:'❋',level:3},
    drop:{name:'Краплик',kind:'drop',color:'#8bd5d3',hp:94,avatar:'◉',level:3}
  };
  let selected='spark', buddy={...creatures.spark}, state='start', questStep=0, dialogPages=[],dialogIndex=0,toastTimer,audioOn=false,audioCtx=null,lastTime=0,elapsed=0,lastSaveAt=0,keys=new Set(),camera={x:0,y:0},savedGame=false;
  const player={x:7.3*TILE,y:12.6*TILE,speed:144,facing:'down',walk:0}, mentor={x:11*TILE,y:8.5*TILE}, gate={x:34*TILE,y:5.5*TILE};
  const arena={playerX:285,enemyX:680,playerY:354,enemyY:348,playerHp:100,enemyHp:100,attackCd:0,dodge:0,enemyCd:1.2,enemyTelegraph:0,invuln:0,hitFlash:0,particles:[],message:'Вибирай момент — і атакуй!',messageTimer:0,time:0,won:false,retries:0};
  const world={cols:48,rows:30};
  const setVisible=(id,yes)=>$(id).hidden=!yes;
  function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
  function sound(freq=440,duration=.07,type='sine'){if(!audioOn)return;try{audioCtx||=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch{}}
  function save(){try{localStorage.setItem('starvalley-save',JSON.stringify({selected,questStep,player:{x:player.x,y:player.y}}));lastSaveAt=elapsed}catch{}}
  function load(){try{const d=JSON.parse(localStorage.getItem('starvalley-save'));if(d&&d.selected&&creatures[d.selected]){selected=d.selected;buddy={...creatures[selected]};questStep=d.questStep||0;player.x=d.player?.x||player.x;player.y=d.player?.y||player.y;return true}}catch{}return false}
  function updateBuddy(){ $('buddyName').textContent=buddy.name;$('buddyAvatar').textContent=buddy.avatar;$('buddyLevel').textContent=`РІВЕНЬ ${String(buddy.level).padStart(2,'0')}`;$('buddyHpText').textContent=buddy.hp }
  function setQuest(){const title=$('questTitle'),hint=$('questHint'),progress=$('questProgress');if(questStep===0){title.textContent='Знайомство з долиною';hint.textContent='Знайди доглядачку Ладу';progress.style.width='22%'}else if(questStep===1){title.textContent='Випробування Світляного кола';hint.textContent='Дістанься старої арени на півночі';progress.style.width='68%'}else{title.textContent='Світло прокинулося';hint.textContent='Досліджуй долину разом';progress.style.width='100%'} }
  function startGame(){
    buddy={...creatures[selected]};if(!savedGame){player.x=7.3*TILE;player.y=12.6*TILE}savedGame=false;state='world';$('startScreen').hidden=true;setVisible('questCard',true);setVisible('buddyCard',true);setVisible('controlsHint',true);setVisible('mobileControls',true);setQuest();updateBuddy();save();
    if(questStep===0)showToast('Знайди Ладу біля стежки й натисни E');else showToast('З поверненням, мандрівнику!');
  }
  function showDialogue(name,texts){dialogPages=Array.isArray(texts)?texts:[texts];dialogIndex=0;$('speakerName').textContent=name;$('speakerIcon').textContent=name==='Лада'?'Л':'✦';setVisible('dialogue',true);setVisible('interaction',false);state='dialogue';renderDialogue()}
  function renderDialogue(){$('dialogueText').textContent=dialogPages[dialogIndex];$('dialogueCount').textContent=`${String(dialogIndex+1).padStart(2,'0')} / ${String(dialogPages.length).padStart(2,'0')}`;$('dialogueNext').innerHTML=dialogIndex===dialogPages.length-1?'Зрозуміло <span>↗</span>':'Далі <span>↗</span>'}
  function nextDialogue(){if(dialogIndex<dialogPages.length-1){dialogIndex++;renderDialogue();sound(480,.04);return}setVisible('dialogue',false);state='world';if(questStep===0){questStep=1;setQuest();save();showToast('Нове завдання · Випробування арени');}else if(questStep===1){questStep=2;setQuest();save()} }
  function beginBattle(){state='battle';arena.playerHp=buddy.hp;arena.enemyHp=100;arena.playerX=280;arena.enemyX=690;arena.attackCd=0;arena.dodge=0;arena.enemyCd=1.3;arena.enemyTelegraph=0;arena.invuln=0;arena.particles=[];arena.message='Вибирай момент — і атакуй!';arena.messageTimer=2;arena.time=0;arena.won=false;
    $('battleMessage').textContent=arena.message;$('enemyName').textContent='Тінекрил';$('playerBattleName').textContent=buddy.name;$('playerLevel').textContent=`РІВЕНЬ ${String(buddy.level).padStart(2,'0')}`;setVisible('arenaHud',true);$('arenaButtons').hidden=false;setVisible('controlsHint',false);sound(270,.18,'triangle');
  }
  function endBattle(won){state='result';arena.won=won;setVisible('arenaHud',false);$('resultScreen').hidden=false;setVisible('mobileControls',false);const card=$('resultScreen'),ey=card.querySelector('.eyebrow'),h=card.querySelector('h2'),p=card.querySelector('p'),reward=card.querySelector('.reward-line'),btn=$('continueButton');if(won){ey.textContent='ПЕРШИЙ ВИКЛИК ПРОЙДЕНО';h.innerHTML='Разом —<br><em>сильніші.</em>';p.innerHTML='Ти й <span id="resultBuddy"></span> розбудили Світляне коло. Але глибоко в лісі вже мерехтить інше, незнайоме світло…';reward.hidden=false;btn.querySelector('span').textContent='ПРОДОВЖИТИ ДОСЛІДЖЕННЯ';buddy.hp=Math.min(buddy.hp,arena.playerHp);if(questStep<2)questStep=2;setQuest();save()}else{ey.textContent='ЦЕ ЛИШЕ ПОЧАТОК';h.innerHTML='Спробуй<br><em>ще раз.</em>';p.innerHTML='Тінекрил виявився спритним, але ви з <span id="resultBuddy"></span> уже знаєте його рухи. Віднови сили й повернись на арену.';reward.hidden=true;btn.querySelector('span').textContent='ПОВЕРНУТИСЯ НА АРЕНУ';buddy.hp=Math.max(48,Math.round(buddy.hp*.72))}$('resultBuddy').textContent=buddy.name;updateBuddy();sound(won?660:180,.22,'triangle')}
  function continueGame(){ $('resultScreen').hidden=true;setVisible('mobileControls',true);if(arena.won){state='world';$('arenaButtons').hidden=true;showToast('✧ +120 досвіду · Новий шлях відкрито');setVisible('questCard',true);setVisible('buddyCard',true);setVisible('controlsHint',true);setQuest();save()}else beginBattle() }
  function interact(){if(state==='dialogue'){nextDialogue();return}if(state!=='world')return;const dm=Math.hypot(player.x-mentor.x,player.y-mentor.y),dg=Math.hypot(player.x-gate.x,player.y-gate.y);if(dm<66){if(questStep===0)showDialogue('Лада',['Вітаю у Вересовій долині! Я Лада — доглядаю за стежками й тими, хто ними мандрує.','Твій напарник має добре серце. На півночі є стара арена — Світляне коло. Колись воно допомагало звірам тренуватися разом.','Там на тебе чекає Тінекрил. Не бійся рухатися й ухилятися: у цій долині битви вирішує не черга, а сміливість!']);else showDialogue('Лада',questStep===1?'Арена на півночі, за кам’яним містком. Тінекрил любить кидатися вперед — ухиляйся, коли побачиш спалах!':'Бачиш, як світиться коло? Долина знову прокидається. Іди туди, куди кличуть зорі.');return}if(dg<78){if(questStep===0){showToast('Спершу поговори з Ладою біля стежки');return}beginBattle();return}showToast('Поруч нікого немає')}
  function closeToInteract(){if(state!=='world')return false;if(Math.hypot(player.x-mentor.x,player.y-mentor.y)<67){$('interactionText').textContent='Поговорити з Ладою';return true}if(Math.hypot(player.x-gate.x,player.y-gate.y)<78){$('interactionText').textContent=questStep<2?'Увійти на арену':'Повторити двобій';return true}return false}
  function tileBlocked(x,y){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);if(tx<1||ty<1||tx>=world.cols-1||ty>=world.rows-1)return true;for(const t of trees){const dx=x-(t.x*TILE+16),dy=y-(t.y*TILE+20);if(Math.abs(dx)<18&&Math.abs(dy)<19)return true}return false}
  const trees=[];for(let y=2;y<29;y++)for(let x=2;x<47;x++){let v=(x*73+y*131+x*y*7)%29;if(v<4&&Math.abs(y-(13-Math.sin(x*.18)*3))>3&&Math.abs(x-32)>6&&Math.abs(x-11)+Math.abs(y-8)>3)trees.push({x,y,type:v%3})}
  function pathAt(x,y){const mid=13-Math.sin(x*.18)*3;return Math.abs(y-mid)<1.45||(x>27&&x<35&&Math.abs(y-(16-(x-27)*1.3))<1.6)||(x>33&&Math.abs(y-5.5)<1.5)||(x>8&&x<13&&Math.abs(y-8)<1.2)}
  function drawWorld(){
    const camX=Math.max(0,Math.min(world.cols*TILE-W,camera.x)),camY=Math.max(0,Math.min(world.rows*TILE-H,camera.y));camera.x=camX;camera.y=camY;
    ctx.fillStyle='#42634a';ctx.fillRect(0,0,W,H);
    const sx=Math.floor(camX/TILE),sy=Math.floor(camY/TILE),ex=sx+31,ey=sy+18;
    for(let ty=sy;ty<=ey;ty++)for(let tx=sx;tx<=ex;tx++){let px=tx*TILE-camX,py=ty*TILE-camY;let n=(tx*31+ty*71+tx*ty*3)%11;ctx.fillStyle=n<3?'#466b4d':n<7?'#41644a':'#496c4c';ctx.fillRect(px,py,TILE+1,TILE+1);if(n===1||n===4){ctx.fillStyle='rgba(180,194,123,.15)';ctx.fillRect(px+5,py+7,2,2);ctx.fillRect(px+22,py+24,2,2)}if(n===8){ctx.fillStyle='rgba(222,198,130,.26)';ctx.fillRect(px+12,py+6,2,3);ctx.fillRect(px+16,py+9,2,3)}}
    // winding paths
    for(let ty=sy;ty<=ey;ty++)for(let tx=sx;tx<=ex;tx++){if(pathAt(tx+.5,ty+.5)){const px=tx*TILE-camX,py=ty*TILE-camY;ctx.fillStyle='#9a8864';ctx.fillRect(px,py,TILE+1,TILE+1);ctx.fillStyle='rgba(228,208,156,.17)';ctx.fillRect(px+4,py+8,11,2);ctx.fillRect(px+21,py+23,6,2);ctx.fillStyle='rgba(74,70,53,.13)';ctx.fillRect(px+8,py+26,15,2)}}
    // flowers / tall grass
    for(let ty=sy;ty<=ey;ty++)for(let tx=sx;tx<=ex;tx++){const px=tx*TILE-camX,py=ty*TILE-camY,n=(tx*19+ty*17)%47;if(n<4&&!pathAt(tx+.5,ty+.5)){ctx.fillStyle=n%2?'#debc75':'#d99d8b';ctx.fillRect(px+8,py+13,3,3);ctx.fillStyle='#afc47c';ctx.fillRect(px+9,py+16,2,8);ctx.fillRect(px+5,py+20,4,2)}if(tx>26&&tx<31&&ty>7&&ty<12&&!pathAt(tx+.5,ty+.5)){ctx.fillStyle='#638b55';ctx.fillRect(px+5,py+13,2,10);ctx.fillRect(px+10,py+8,2,15);ctx.fillRect(px+15,py+11,2,13);ctx.fillRect(px+20,py+7,2,18);ctx.fillRect(px+25,py+13,2,10)}}
    for(const t of trees){const x=t.x*TILE-camX,y=t.y*TILE-camY;if(x<-40||x>W+40||y<-50||y>H+30)continue;drawTree(x,y,t.type)}
    drawGate(gate.x-camX,gate.y-camY,elapsed);
    drawNpc(mentor.x-camX,mentor.y-camY,elapsed);
    drawPlayer(player.x-camX,player.y-camY,elapsed);
    if(questStep===0){drawMarker(mentor.x-camX,mentor.y-camY-40,elapsed)}else if(questStep===1){drawMarker(gate.x-camX,gate.y-camY-52,elapsed)}
    // subtle boundaries / forest depth
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'rgba(9,24,18,.15)');grad.addColorStop(1,'rgba(12,26,18,.08)');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  }
  function drawTree(x,y,type=0){ctx.fillStyle='rgba(17,34,25,.35)';ctx.beginPath();ctx.ellipse(x+16,y+28,19,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#614e3a';ctx.fillRect(x+12,y+13,8,19);let colors=type===0?['#294d3a','#356044','#46734b']:type===1?['#34503a','#426744','#56784a']:['#2b4939','#395d43','#4b714b'];ctx.fillStyle=colors[0];ctx.fillRect(x+1,y+1,30,19);ctx.fillRect(x+5,y-6,22,22);ctx.fillStyle=colors[1];ctx.fillRect(x+3,y-3,19,14);ctx.fillRect(x+17,y+2,12,13);ctx.fillStyle=colors[2];ctx.fillRect(x+8,y-6,9,7);ctx.fillRect(x+3,y+7,7,5);ctx.fillStyle='rgba(194,204,139,.18)';ctx.fillRect(x+10,y-4,5,3)}
  function drawNpc(x,y,t){ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(t*2)*1.5));ctx.fillStyle='rgba(12,23,19,.35)';ctx.beginPath();ctx.ellipse(0,12,12,4,0,0,7);ctx.fill();ctx.fillStyle='#503e32';ctx.fillRect(-6,1,5,12);ctx.fillRect(2,1,5,12);ctx.fillStyle='#d5a77c';ctx.fillRect(-8,-15,16,16);ctx.fillStyle='#b98168';ctx.fillRect(-9,-16,18,6);ctx.fillStyle='#d5c68e';ctx.fillRect(-10,-2,20,13);ctx.fillStyle='#755b44';ctx.fillRect(-10,6,20,4);ctx.fillStyle='#3d4033';ctx.fillRect(-4,-9,2,2);ctx.fillRect(4,-9,2,2);ctx.restore()}
  function drawPlayer(x,y,t){ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(t*9)*1.2));ctx.fillStyle='rgba(14,24,17,.4)';ctx.beginPath();ctx.ellipse(0,13,10,4,0,0,7);ctx.fill();ctx.fillStyle='#543f32';ctx.fillRect(-6,5,5,8);ctx.fillRect(2,5,5,8);ctx.fillStyle='#e1c49b';ctx.fillRect(-8,-13,16,17);ctx.fillStyle='#496b63';ctx.fillRect(-10,-3,20,13);ctx.fillStyle='#253b36';ctx.fillRect(-10,7,20,4);ctx.fillStyle='#bd986e';ctx.fillRect(-8,-16,16,5);ctx.fillStyle='#292e29';ctx.fillRect(-4,-8,2,2);ctx.fillRect(4,-8,2,2);ctx.fillStyle='#e7d28f';ctx.fillRect(7,-4,3,5);ctx.restore()}
  function drawGate(x,y,t){ctx.save();ctx.translate(Math.round(x),Math.round(y));const glow=.45+Math.sin(t*2)*.13;ctx.fillStyle=`rgba(223,203,129,${glow*.23})`;ctx.beginPath();ctx.ellipse(0,0,38,19,0,0,7);ctx.fill();ctx.strokeStyle=`rgba(231,213,147,${glow})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,30,12,0,0,7);ctx.stroke();ctx.fillStyle='#7d7860';ctx.fillRect(-37,-6,9,18);ctx.fillRect(28,-6,9,18);ctx.fillStyle='#aaa17a';ctx.fillRect(-34,-13,5,7);ctx.fillRect(29,-13,5,7);ctx.fillStyle='#e4d58f';ctx.font='16px serif';ctx.textAlign='center';ctx.fillText('✧',0,-2);ctx.restore()}
  function drawMarker(x,y,t){ctx.save();const up=Math.sin(t*3)*4;ctx.fillStyle='#f0da98';ctx.shadowColor='#f0da98';ctx.shadowBlur=15;ctx.font='17px serif';ctx.textAlign='center';ctx.fillText('✦',x,y+up);ctx.restore()}
  function drawBuddy(x,y,kind,scale=1,t=0,flash=0){ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(t*5)*3));ctx.scale(scale,scale);if(flash>0)ctx.globalAlpha=.5+Math.sin(t*50)*.5;ctx.fillStyle='rgba(8,18,15,.36)';ctx.beginPath();ctx.ellipse(0,34,35,10,0,0,Math.PI*2);ctx.fill();
    if(kind==='spark'){ctx.fillStyle='#b85d39';ctx.beginPath();ctx.ellipse(0,5,28,30,0,0,7);ctx.fill();ctx.fillStyle='#e99a54';ctx.fillRect(-24,-3,48,25);ctx.fillStyle='#ffc86f';ctx.fillRect(-20,-10,40,16);ctx.fillStyle='#a94e37';ctx.beginPath();ctx.moveTo(-20,-14);ctx.lineTo(-27,-41);ctx.lineTo(-5,-21);ctx.fill();ctx.beginPath();ctx.moveTo(20,-14);ctx.lineTo(27,-41);ctx.lineTo(5,-21);ctx.fill();ctx.fillStyle='#ffd786';ctx.fillRect(-21,14,13,14);ctx.fillRect(9,14,13,14);ctx.fillStyle='#332d29';ctx.fillRect(-12,0,5,8);ctx.fillRect(8,0,5,8);ctx.fillStyle='#fff2ca';ctx.fillRect(-11,0,2,3);ctx.fillRect(9,0,2,3);ctx.fillStyle='#824239';ctx.fillRect(-3,12,6,2);ctx.fillStyle='#f6803e';ctx.fillRect(25,2,8,13);ctx.fillStyle='#ffd276';ctx.fillRect(29,-3,5,7);ctx.fillRect(30,14,5,7)}
    else if(kind==='moss'){ctx.fillStyle='#658d55';ctx.beginPath();ctx.ellipse(0,8,31,26,0,0,7);ctx.fill();ctx.fillStyle='#a6c77e';ctx.beginPath();ctx.ellipse(0,1,26,24,0,0,7);ctx.fill();ctx.fillStyle='#527b50';ctx.fillRect(-25,7,10,17);ctx.fillRect(15,7,10,17);ctx.fillStyle='#bbd98e';ctx.fillRect(-14,17,11,11);ctx.fillRect(5,17,11,11);ctx.fillStyle='#3b4937';ctx.fillRect(-11,-1,5,7);ctx.fillRect(7,-1,5,7);ctx.fillStyle='#f2e7b6';ctx.fillRect(-10,-1,2,3);ctx.fillRect(8,-1,2,3);ctx.fillStyle='#658d55';ctx.beginPath();ctx.moveTo(-18,-16);ctx.lineTo(-11,-40);ctx.lineTo(-1,-18);ctx.fill();ctx.beginPath();ctx.moveTo(1,-17);ctx.lineTo(19,-38);ctx.lineTo(17,-13);ctx.fill();ctx.fillStyle='#d3e6a3';ctx.fillRect(-11,-34,3,10);ctx.fillRect(11,-31,3,8);ctx.fillStyle='#e58d73';ctx.fillRect(-4,12,8,2)}
    else{ctx.fillStyle='#4e8d9d';ctx.beginPath();ctx.ellipse(0,6,27,31,0,0,7);ctx.fill();ctx.fillStyle='#7dc6c5';ctx.beginPath();ctx.ellipse(0,1,24,25,0,0,7);ctx.fill();ctx.fillStyle='#b5e3d5';ctx.fillRect(-15,12,30,13);ctx.fillStyle='#447f91';ctx.beginPath();ctx.moveTo(-19,-11);ctx.lineTo(-27,-30);ctx.lineTo(-6,-18);ctx.fill();ctx.beginPath();ctx.moveTo(19,-11);ctx.lineTo(27,-30);ctx.lineTo(6,-18);ctx.fill();ctx.fillStyle='#263a3a';ctx.fillRect(-11,-2,5,8);ctx.fillRect(7,-2,5,8);ctx.fillStyle='#f4f3d9';ctx.fillRect(-10,-2,2,3);ctx.fillRect(8,-2,2,3);ctx.fillStyle='#497d8a';ctx.fillRect(-19,15,9,13);ctx.fillRect(10,15,9,13);ctx.fillStyle='#e8a393';ctx.fillRect(-3,11,6,2)}
    ctx.restore()}
  function drawArena(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a302b');sky.addColorStop(.55,'#304d3c');sky.addColorStop(1,'#172a25');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // moonlit hills and ancient columns
    ctx.fillStyle='#213b31';ctx.beginPath();ctx.moveTo(0,290);ctx.lineTo(120,226);ctx.lineTo(234,275);ctx.lineTo(376,205);ctx.lineTo(510,273);ctx.lineTo(673,218);ctx.lineTo(810,274);ctx.lineTo(960,210);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.fill();
    ctx.fillStyle='rgba(185,196,146,.12)';ctx.beginPath();ctx.ellipse(486,381,344,108,0,0,7);ctx.fill();ctx.strokeStyle='rgba(219,204,139,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(486,378,276,83,0,0,7);ctx.stroke();ctx.strokeStyle='rgba(218,210,165,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(486,378,240,64,0,0,7);ctx.stroke();
    ctx.fillStyle='#817b5f';ctx.fillRect(108,186,29,160);ctx.fillRect(100,179,45,11);ctx.fillRect(112,346,25,9);ctx.fillRect(820,160,29,178);ctx.fillRect(812,153,45,11);ctx.fillRect(824,338,25,9);ctx.fillStyle='rgba(221,210,148,.22)';ctx.fillRect(116,204,4,126);ctx.fillRect(829,180,4,139);
    for(let i=0;i<12;i++){const x=((i*103+arena.time*11)%1050)-40,y=130+(i*79)%210;ctx.fillStyle=`rgba(234,222,157,${.25+Math.sin(arena.time*2+i)*.18})`;ctx.fillRect(x,y,3,3)}
    // ground
    ctx.fillStyle='#374d39';ctx.fillRect(0,442,W,98);ctx.fillStyle='#536242';ctx.fillRect(0,442,W,5);ctx.fillStyle='rgba(205,196,133,.18)';ctx.fillRect(0,447,W,2);
    ctx.fillStyle='#73805b';for(let i=0;i<40;i++){const x=(i*57+19)%960,y=453+(i*37)%77;ctx.fillRect(x,y,3,2)}
    // telegraph and creature shadows
    if(arena.enemyTelegraph>0){ctx.strokeStyle=`rgba(247,131,102,${.55+Math.sin(arena.time*32)*.35})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(arena.playerX,arena.playerY+22,48,13,0,0,7);ctx.stroke()}
    drawBuddy(arena.playerX,arena.playerY,buddy.kind,1.08,elapsed,arena.invuln>0?1:0);
    drawEnemy(arena.enemyX,arena.enemyY,elapsed,arena.hitFlash);
    for(const p of arena.particles){ctx.globalAlpha=Math.max(0,p.life/.5);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);ctx.globalAlpha=1}
  }
  function drawEnemy(x,y,t,flash){ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(t*4)*3));ctx.fillStyle='rgba(8,17,15,.4)';ctx.beginPath();ctx.ellipse(0,34,41,11,0,0,7);ctx.fill();if(flash>0)ctx.globalAlpha=.35+Math.sin(t*55)*.4;
    ctx.fillStyle='#524763';ctx.beginPath();ctx.ellipse(0,4,31,29,0,0,7);ctx.fill();ctx.fillStyle='#80739a';ctx.fillRect(-25,-8,50,24);ctx.fillStyle='#ac99bb';ctx.fillRect(-19,-13,38,13);
    ctx.fillStyle='#433b5b';ctx.beginPath();ctx.moveTo(-20,-8);ctx.lineTo(-50,-37);ctx.lineTo(-42,2);ctx.lineTo(-25,13);ctx.fill();ctx.beginPath();ctx.moveTo(20,-8);ctx.lineTo(50,-37);ctx.lineTo(42,2);ctx.lineTo(25,13);ctx.fill();ctx.fillStyle='#b8a7c7';ctx.fillRect(-44,-27,5,20);ctx.fillRect(39,-27,5,20);
    ctx.fillStyle='#ddb45d';ctx.fillRect(-13,-3,6,9);ctx.fillRect(7,-3,6,9);ctx.fillStyle='#fff0b0';ctx.fillRect(-12,-2,2,3);ctx.fillRect(8,-2,2,3);ctx.fillStyle='#473847';ctx.fillRect(-4,12,8,2);ctx.fillStyle='#695b7d';ctx.fillRect(-23,17,13,13);ctx.fillRect(10,17,13,13);ctx.fillStyle='#aa7893';ctx.fillRect(-7,-23,14,9);ctx.fillRect(-3,-31,6,9);ctx.restore()}
  function burst(x,y,color,n=9){for(let i=0;i<n;i++)arena.particles.push({x,y,vx:(Math.random()-.5)*140,vy:(Math.random()-.7)*140,life:.45,color})}
  function battleMessage(text){arena.message=text;arena.messageTimer=1.5;$('battleMessage').textContent=text}
  function updateBattle(dt){const strikeDue=arena.enemyTelegraph>0&&arena.enemyTelegraph<=dt;arena.time+=dt;arena.attackCd=Math.max(0,arena.attackCd-dt);arena.dodge=Math.max(0,arena.dodge-dt);arena.invuln=Math.max(0,arena.invuln-dt);arena.hitFlash=Math.max(0,arena.hitFlash-dt);arena.enemyCd-=dt;arena.enemyTelegraph=Math.max(0,arena.enemyTelegraph-dt);arena.messageTimer=Math.max(0,arena.messageTimer-dt);
    let move=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);if(move){arena.playerX+=move*(arena.dodge>0?430:205)*dt;arena.playerX=Math.max(130,Math.min(810,arena.playerX))}
    if(arena.dodge>0){arena.playerX+=((arena.playerX<arena.enemyX)?-1:1)*30*dt}
    const distance=Math.abs(arena.enemyX-arena.playerX),dir=arena.playerX>arena.enemyX?1:-1;
    if(distance>92)arena.enemyX+=dir*82*dt;
    if(arena.enemyCd<=0){if(distance<145){arena.enemyTelegraph=.48;arena.enemyCd=1.58}else{arena.enemyCd=.9;arena.particles.push({x:arena.enemyX,y:arena.enemyY-10,vx:dir*210,vy:0,life:1.6,color:'#dc8d9d',enemyOrb:true})}}
    if(strikeDue){arena.enemyTelegraph=0;if(Math.abs(arena.enemyX-arena.playerX)<118&&arena.invuln<=0){arena.playerHp-=buddy.kind==='moss'?12:16;arena.invuln=.35;burst(arena.playerX,arena.playerY,'#e28574',7);battleMessage('Тінекрил влучив! Рухайся, щоб ухилитися.')}else battleMessage('Чудове ухилення!')}
    for(let i=arena.particles.length-1;i>=0;i--){const p=arena.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.enemyOrb&&Math.abs(p.x-arena.playerX)<24&&Math.abs(p.y-arena.playerY)<40&&arena.invuln<=0){arena.playerHp-=12;arena.invuln=.5;burst(arena.playerX,arena.playerY,'#d58f9e',6);battleMessage('Тінекрил послав тіньову іскру!')}if(p.life<=0)arena.particles.splice(i,1)}
    arena.playerHp=Math.max(0,arena.playerHp);arena.enemyHp=Math.max(0,arena.enemyHp);$('playerHpText').textContent=`${arena.playerHp} / ${buddy.hp}`;$('enemyHpText').textContent=`${arena.enemyHp} / 100`;$('playerHealth').style.width=`${arena.playerHp/buddy.hp*100}%`;$('enemyHealth').style.width=`${arena.enemyHp}%`;$('attackCooldown').textContent=arena.attackCd>0?`УДАР · ${arena.attackCd.toFixed(1)}с`:'УДАР ГОТОВИЙ';$('attackCooldown').classList.toggle('ready',arena.attackCd<=0);
    if(arena.playerHp<=0){endBattle(false);return}if(arena.enemyHp<=0){endBattle(true)}
  }
  function attack(){if(state!=='battle'||arena.attackCd>0)return;arena.attackCd=.64;const d=Math.abs(arena.enemyX-arena.playerX);if(d<156){const dmg=buddy.kind==='spark'?25:buddy.kind==='moss'?20:22;arena.enemyHp-=dmg;arena.hitFlash=.2;burst(arena.enemyX-15,arena.enemyY-6,buddy.color,12);battleMessage(`${buddy.name}: влучний удар! −${dmg}`);sound(590,.09,'square')}else if(d<255){const dmg=buddy.kind==='drop'?16:12;arena.enemyHp-=dmg;arena.hitFlash=.16;burst(arena.enemyX-12,arena.enemyY-8,buddy.color,8);battleMessage(`${buddy.name} випускає зоряну хвилю! −${dmg}`);sound(490,.08,'sine')}else{battleMessage('Підійди ближче, щоб дістати!');sound(180,.04)} }
  function dodge(){if(state!=='battle'||arena.dodge>0||arena.invuln>0)return;arena.dodge=.23;arena.invuln=.5;burst(arena.playerX,arena.playerY+12,'#d8dda4',5);sound(340,.06,'triangle')}
  function update(dt){elapsed+=dt;if(state==='world'){let dx=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),dy=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;player.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');player.walk+=dt*10;const nx=player.x+dx*player.speed*dt,ny=player.y+dy*player.speed*dt;if(!tileBlocked(nx,player.y))player.x=nx;if(!tileBlocked(player.x,ny))player.y=ny}else player.walk=0;camera.x=player.x-W/2;camera.y=player.y-H/2;drawWorld();const near=closeToInteract();setVisible('interaction',near);if(Math.hypot(player.x-mentor.x,player.y-mentor.y)<67||Math.hypot(player.x-gate.x,player.y-gate.y)<78){if(keys.has('KeyE')){keys.delete('KeyE');interact()}}if(elapsed-lastSaveAt>2.5)save();}
    else if(state==='battle'){updateBattle(dt);drawArena()}else if(state==='start'||state==='dialogue'||state==='result'){if(state==='start')drawTitleBackdrop();else if(state==='dialogue'){drawWorld();drawMarker(mentor.x-camera.x,mentor.y-camera.y-40,elapsed)}else if(state==='result')drawArena()}
  }
  function drawTitleBackdrop(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b332d');g.addColorStop(1,'#324b36');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let i=0;i<14;i++){const x=(i*97+elapsed*5)%1000,y=70+(i*63)%380;ctx.fillStyle=`rgba(226,216,157,${.24+Math.sin(elapsed*2+i)*.2})`;ctx.fillRect(x,y,2,2)}}
  function syncStarterSelection(){
    document.querySelectorAll('.starter-card').forEach(card=>{
      const active=card.dataset.starter===selected;
      card.classList.toggle('selected',active);
      card.setAttribute('aria-pressed',String(active));
    });
    const art=$('artCreature');
    art.textContent=creatures[selected].avatar;
    art.className=`art-creature ${selected}-art`;
  }
  function pressKey(code){keys.add(code)}
  function releaseKey(code){keys.delete(code)}
  function frame(now){
    const dt=lastTime?Math.min((now-lastTime)/1000,.05):0;
    lastTime=now;
    update(dt);
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.starter-card').forEach(card=>card.addEventListener('click',()=>{
    selected=card.dataset.starter;
    syncStarterSelection();
    sound(420,.05);
  }));
  $('beginButton').addEventListener('click',startGame);
  $('continueButton').addEventListener('click',continueGame);
  $('dialogueNext').addEventListener('click',nextDialogue);
  $('interactTouch').addEventListener('pointerdown',event=>{
    event.preventDefault();
    if(state==='dialogue')nextDialogue();else interact();
  });
  $('soundButton').addEventListener('click',()=>{
    audioOn=!audioOn;
    $('soundButton').classList.toggle('sound-on',audioOn);
    $('soundButton').setAttribute('aria-pressed',String(audioOn));
    if(audioOn)sound(520,.08);
    showToast(audioOn?'Звук увімкнено':'Звук вимкнено');
  });
  document.addEventListener('keydown',event=>{
    const code=event.code;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(code))event.preventDefault();
    if(event.repeat)return;
    if(code==='KeyE'){
      if(state==='dialogue')nextDialogue();
      else if(state==='world')interact();
      return;
    }
    if(code==='Space'){
      if(state==='dialogue')nextDialogue();else attack();
      return;
    }
    if(code==='ShiftLeft'||code==='ShiftRight'){dodge();return}
    pressKey(code);
  });
  document.addEventListener('keyup',event=>releaseKey(event.code));
  window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('[data-key]').forEach(button=>{
    const code=button.dataset.key;
    const down=event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);if(code==='Space')attack();else if(code==='ShiftLeft')dodge();else pressKey(code)};
    const up=event=>{event.preventDefault();releaseKey(code)};
    button.addEventListener('pointerdown',down);
    button.addEventListener('pointerup',up);
    button.addEventListener('pointercancel',up);
    button.addEventListener('lostpointercapture',up);
    button.addEventListener('contextmenu',event=>event.preventDefault());
  });
  document.addEventListener('visibilitychange',()=>{lastTime=0;keys.clear()});

  savedGame=load();
  syncStarterSelection();
  if(questStep>0)$('beginButton').querySelector('span').textContent='ПРОДОВЖИТИ ПОДОРОЖ';
  updateBuddy();
  requestAnimationFrame(frame);
})();
