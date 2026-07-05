const upgradeTable={0:{cost:100,success:100,keep:0,destroy:0},1:{cost:200,success:90,keep:10,destroy:0},2:{cost:350,success:80,keep:20,destroy:0},3:{cost:550,success:70,keep:28,destroy:2},4:{cost:800,success:60,keep:35,destroy:5},5:{cost:1100,success:50,keep:40,destroy:10},6:{cost:1500,success:45,keep:45,destroy:10},7:{cost:2000,success:40,keep:50,destroy:10},8:{cost:2700,success:35,keep:55,destroy:10},9:{cost:3600,success:30,keep:60,destroy:10},10:{cost:4800,success:25,keep:65,destroy:10},11:{cost:6300,success:22,keep:68,destroy:10},12:{cost:8200,success:20,keep:70,destroy:10},13:{cost:10500,success:18,keep:72,destroy:10},14:{cost:13500,success:15,keep:75,destroy:10},15:{cost:17000,success:12,keep:78,destroy:10},16:{cost:21000,success:10,keep:80,destroy:10},17:{cost:26000,success:8,keep:82,destroy:10},18:{cost:32000,success:6,keep:84,destroy:10},19:{cost:40000,success:4,keep:85,destroy:11}};

// images 폴더 안에 rod0.png ~ rod20.png 이름으로 넣으면 자동 표시됨.
const imageExtension="png";
const imageFolder="images";

let state={level:0,totalGold:0,highestLevel:0,tryCount:0,successCount:0,keepCount:0,destroyCount:0,logs:[]};
let isAutoRunning=false;
let autoTimer=null;
let simCache={};

const $=id=>document.getElementById(id);
const levelDisplay=$("levelDisplay"),resultText=$("resultText"),successRate=$("successRate"),keepRate=$("keepRate"),destroyRate=$("destroyRate"),costDisplay=$("costDisplay"),totalGold=$("totalGold"),highestLevel=$("highestLevel"),tryCount=$("tryCount"),successCount=$("successCount"),keepCount=$("keepCount"),destroyCount=$("destroyCount"),logBox=$("logBox"),mainCard=$("mainCard"),rodImageBox=$("rodImageBox"),guaranteedCostPreview=$("guaranteedCostPreview"),luckText=$("luckText");
const pearlLevelSelect=$("pearlLevel"),targetLevelSelect=$("targetLevel"),autoSpeedSelect=$("autoSpeed"),guaranteedTargetSelect=$("guaranteedTarget");
const upgradeBtn=$("upgradeBtn"),autoBtn=$("autoBtn"),averageBtn=$("averageBtn"),resetBtn=$("resetBtn"),luckBtn=$("luckBtn");

function formatGold(v){return Math.round(v).toLocaleString()+" G";}
function getPearlBonus(){return Number(pearlLevelSelect.value)*0.5;}
function getRateWithBonus(level,bonus){if(level>=20)return{cost:0,success:0,keep:0,destroy:0};const base=upgradeTable[level];const destroy=base.destroy;const maxSuccess=100-destroy;let success=base.success+bonus;if(success>maxSuccess)success=maxSuccess;let keep=100-destroy-success;if(keep<0)keep=0;return{cost:base.cost,success,keep,destroy};}
function getRate(level){return getRateWithBonus(level,getPearlBonus());}
function addLog(msg,type="info"){state.logs.unshift(`<div class="log-${type}">${msg}</div>`);if(state.logs.length>160)state.logs.pop();}
function playAnimation(type){mainCard.classList.remove("success-anim","keep-anim","destroy-anim");void mainCard.offsetWidth;if(type==="success")mainCard.classList.add("success-anim");if(type==="keep")mainCard.classList.add("keep-anim");if(type==="destroy")mainCard.classList.add("destroy-anim");}

function updateRodImage(){
  const src=`${imageFolder}/rod${state.level}.${imageExtension}`;
  const img=new Image();
  img.onload=function(){rodImageBox.innerHTML=`<img src="${src}" alt="+${state.level} 낚시대">`;};
  img.onerror=function(){rodImageBox.innerHTML=`<div class="rod-placeholder">+${state.level} 낚시대<br><small>이미지 준비 중</small></div>`;};
  img.src=src;
}

function expectedCostFrom(start,target){if(start>=target)return 0;const bonus=getPearlBonus();const a={},b={};a[target]=0;b[target]=0;for(let i=target-1;i>=0;i--){const r=getRateWithBonus(i,bonus);const s=r.success/100,k=r.keep/100,d=r.destroy/100;const denom=1-k;a[i]=(r.cost+s*a[i+1])/denom;b[i]=(s*b[i+1]+d)/denom;}const e0=a[0]/(1-b[0]);if(start===0)return e0;return a[start]+b[start]*e0;}
function updateGuaranteedCostPreview(){const t=Number(guaranteedTargetSelect.value);guaranteedCostPreview.textContent=state.level>=t?"이미 목표 이상":formatGold(expectedCostFrom(state.level,t));}
function updateLuckText(){
  if(state.highestLevel<=0||state.totalGold<=0){
    luckText.textContent="강화 시도 중 최고 도달 등급과 누적 골드 기준으로 운 분위 계산 가능";
    return;
  }
  const exp=expectedCostFrom(0,state.highestLevel);
  const ratio=state.totalGold/exp;
  let grade="A",comment="평균 근처입니다.";
  if(ratio<=.35){grade="SSS";comment="말도 안 되게 운이 좋습니다.";}
  else if(ratio<=.55){grade="SS";comment="상당히 운이 좋습니다.";}
  else if(ratio<=.8){grade="S";comment="평균보다 운이 좋습니다.";}
  else if(ratio<=1.2){grade="A";comment="평균과 비슷합니다.";}
  else if(ratio<=1.8){grade="C";comment="평균보다 운이 나쁩니다.";}
  else{grade="D";comment="꽤 많이 터졌습니다.";}
  luckText.textContent=`시도 중 최고 +${state.highestLevel} 기준 / 누적 ${formatGold(state.totalGold)} / 평균 대비 ${(ratio*100).toFixed(0)}% / 등급 ${grade} - ${comment}`;
}
function updateUI(){levelDisplay.textContent="+"+state.level;totalGold.textContent=formatGold(state.totalGold);highestLevel.textContent="+"+state.highestLevel;tryCount.textContent=state.tryCount.toLocaleString();successCount.textContent=state.successCount.toLocaleString();keepCount.textContent=state.keepCount.toLocaleString();destroyCount.textContent=state.destroyCount.toLocaleString();const r=getRate(state.level);if(state.level>=20){successRate.textContent="-";keepRate.textContent="-";destroyRate.textContent="-";costDisplay.textContent="-";resultText.textContent="최대 강화 달성";}else{successRate.textContent=r.success.toFixed(1).replace(".0","")+"%";keepRate.textContent=r.keep.toFixed(1).replace(".0","")+"%";destroyRate.textContent=r.destroy.toFixed(1).replace(".0","")+"%";costDisplay.textContent=formatGold(r.cost);}logBox.innerHTML=state.logs.join("");updateRodImage();updateGuaranteedCostPreview();updateLuckText();saveState();}
function upgradeOnce(){if(state.level>=20){addLog("이미 20강입니다.","info");resultText.textContent="최대 강화";updateUI();return;}const before=state.level,r=getRate(before);state.totalGold+=r.cost;state.tryCount++;const roll=Math.random()*100;if(roll<r.success){state.level++;state.successCount++;if(state.level>state.highestLevel)state.highestLevel=state.level;resultText.textContent="성공!";addLog(`+${before} → +${state.level} 성공 / -${formatGold(r.cost)}`,"success");playAnimation("success");}else if(roll<r.success+r.keep){state.keepCount++;resultText.textContent="유지";addLog(`+${before} 유지 / -${formatGold(r.cost)}`,"keep");playAnimation("keep");}else{state.level=0;state.destroyCount++;resultText.textContent="파괴! +0으로 복귀";addLog(`+${before} 파괴 → +0 / -${formatGold(r.cost)}`,"destroy");playAnimation("destroy");}updateUI();}
function averageToSelectedTarget(){const t=Number(guaranteedTargetSelect.value);if(state.level>=t){addLog(`이미 +${t}강 이상입니다.`,"info");resultText.textContent=`이미 +${t}강 이상`;updateUI();return;}const before=state.level,cost=expectedCostFrom(state.level,t);state.totalGold+=cost;state.level=t;if(state.highestLevel<t)state.highestLevel=t;resultText.textContent=`평균비용으로 +${t}강 확정`;addLog(`평균 확정강화: +${before} → +${t} / -${formatGold(cost)}`,"info");playAnimation("success");updateUI();}
function toggleAuto(){isAutoRunning?stopAuto():startAuto();}
function startAuto(){const target=Number(targetLevelSelect.value);if(state.level>=target){addLog(`이미 목표 +${target} 이상입니다.`,"info");updateUI();return;}isAutoRunning=true;autoBtn.textContent="자동강화 정지";upgradeBtn.disabled=true;averageBtn.disabled=true;luckBtn.disabled=true;runAutoStep();}
function runAutoStep(){if(!isAutoRunning)return;const target=Number(targetLevelSelect.value);if(state.level>=target){stopAuto();addLog(`목표 +${target} 달성! 현재 누적 ${formatGold(state.totalGold)}`,"success");resultText.textContent=`목표 +${target} 달성`;updateUI();return;}upgradeOnce();autoTimer=setTimeout(runAutoStep,Number(autoSpeedSelect.value));}
function stopAuto(){isAutoRunning=false;autoBtn.textContent="자동강화 시작";upgradeBtn.disabled=false;averageBtn.disabled=false;luckBtn.disabled=false;if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}}
function simulateOne(target,bonus){let lv=0,gold=0,safe=0;while(lv<target&&safe<200000){safe++;const r=getRateWithBonus(lv,bonus);gold+=r.cost;const roll=Math.random()*100;if(roll<r.success)lv++;else if(roll<r.success+r.keep){}else lv=0;}return gold;}
function percentileOfValue(sorted,value){let count=0;for(let i=0;i<sorted.length;i++){if(sorted[i]<=value)count++;else break;}return count/sorted.length*100;}
function calcLuckPercentile(){
  const target=state.highestLevel;
  const value=state.totalGold;
  if(target<=0||value<=0){alert("아직 강화 기록이 없습니다.");return;}
  const bonus=getPearlBonus();
  const key=`${target}_${bonus}`;
  luckText.textContent="시뮬레이션 계산 중... 잠깐만 기다려주세요.";
  setTimeout(()=>{
    let arr=simCache[key];
    if(!arr){
      const runs=5000;
      arr=[];
      for(let i=0;i<runs;i++)arr.push(simulateOne(target,bonus));
      arr.sort((a,b)=>a-b);
      simCache[key]=arr;
    }

    const p=percentileOfValue(arr,value);

    // 비용은 낮을수록 운이 좋은 것.
    // p는 "나보다 같거나 적게 쓴 사람 비율"이므로,
    // 운 좋은 상위 %로 그대로 사용한다.
    // 예: p=10 -> 운 좋은 상위 10%
    // 예: p=89 -> 운 좋은 상위 89%, 즉 하위권
    const topGood=Math.max(0,Math.min(100,p));
    const worseThan=Math.max(0,100-topGood);

    let grade="B";
    if(topGood<=1)grade="SSS";
    else if(topGood<=5)grade="SS";
    else if(topGood<=15)grade="S";
    else if(topGood<=35)grade="A";
    else if(topGood<=65)grade="B";
    else if(topGood<=85)grade="C";
    else grade="D";

    luckText.textContent=`시도 중 최고 +${target} 기준 운 좋은 상위 ${topGood.toFixed(1)}% / 등급 ${grade} / 누적 ${formatGold(value)} / 나보다 더 쓴 사람 약 ${worseThan.toFixed(1)}% / 5000회 시뮬레이션 기준`;
    addLog(`운 분위 계산 완료: 최고 +${target}, 운 좋은 상위 ${topGood.toFixed(1)}%`,"info");
    saveState();
  },80);
}
function saveState(){const data={state,pearlLevel:pearlLevelSelect.value,targetLevel:targetLevelSelect.value,autoSpeed:autoSpeedSelect.value,guaranteedTarget:guaranteedTargetSelect.value};localStorage.setItem("upgradeSimulatorSaveV17",JSON.stringify(data));}
function loadState(){const saved=localStorage.getItem("upgradeSimulatorSaveV17");if(!saved)return;try{const data=JSON.parse(saved);if(data.state)state=data.state;if(data.pearlLevel!==undefined)pearlLevelSelect.value=data.pearlLevel;if(data.targetLevel!==undefined)targetLevelSelect.value=data.targetLevel;if(data.autoSpeed!==undefined)autoSpeedSelect.value=data.autoSpeed;if(data.guaranteedTarget!==undefined)guaranteedTargetSelect.value=data.guaranteedTarget;}catch(e){console.log("저장 데이터 불러오기 실패",e);}}
function resetGame(){if(!confirm("정말 초기화할까요?"))return;stopAuto();state={level:0,totalGold:0,highestLevel:0,tryCount:0,successCount:0,keepCount:0,destroyCount:0,logs:[]};localStorage.removeItem("upgradeSimulatorSaveV17");resultText.textContent="초기화 완료";addLog("시뮬레이터를 초기화했습니다.","info");updateUI();}
upgradeBtn.addEventListener("click",upgradeOnce);
autoBtn.addEventListener("click",toggleAuto);
averageBtn.addEventListener("click",averageToSelectedTarget);
resetBtn.addEventListener("click",resetGame);
luckBtn.addEventListener("click",calcLuckPercentile);
pearlLevelSelect.addEventListener("change",()=>{simCache={};addLog(`진주 업그레이드 변경: ${pearlLevelSelect.options[pearlLevelSelect.selectedIndex].text}`,"info");updateUI();});
targetLevelSelect.addEventListener("change",updateUI);
autoSpeedSelect.addEventListener("change",updateUI);
guaranteedTargetSelect.addEventListener("change",updateUI);
loadState();
updateUI();
