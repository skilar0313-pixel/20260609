let handpose;
let video;
let predictions = [];
let questions = [];
let questionTable;
let currentQ = 0;
let score = 0;
let questionsAnswered = 0;
let gameState = "PLAYING"; // PLAYING, FINISHED
let feedback = "";
let lastActionTime = 0;
const cooldown = 2000; // 判定冷卻時間 (毫秒)
const TOTAL_QUESTIONS = 10;

// 奶油像素配色
const C_BG = [255, 253, 220]; // 奶油底色
const C_TEXT = [93, 64, 55];  // 深咖文字
const C_ACCENT = [255, 138, 101]; // 粉橘強調
const C_BTN = [[255, 204, 128], [255, 224, 130], [255, 245, 157]]; // 三個選項顏色

// 貓咪工程師的資料陣列
let catEngineers = [];

function preload() {
  questionTable = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 簡化 CSV 讀取邏輯：直接照原本的順序 1, 2, 3 放入陣列
  let allData = [];
  for (let i = 0; i < questionTable.getRowCount(); i++) {
    let r = questionTable.getRow(i);
    let rawAns = parseInt(r.get('answer')); // 欄位值為 1, 2, 或 3

    allData.push({
      q: r.get('question'),
      // 依序排列：選項1在索引0, 選項2在索引1, 選項3在索引2
      opts: [r.get('option1'), r.get('option2'), r.get('option3')],
      ans: rawAns // 正確答案直接存 1, 2, 3
    });
  }
  
  allData.sort(() => Math.random() - 0.5);
  questions = allData.slice(0, TOTAL_QUESTIONS);

  // 設定攝影機
  video = createCapture(VIDEO);
  video.size(640, 480);

  // 初始化 ml5 handPose 模型
  handpose = ml5.handPose(video, () => {
    console.log("模型準備就緒！");
    handpose.detectStart(video, results => {
      predictions = results;
    });
  });

  video.hide();

  // 初始化 4 隻貓咪工程師
  let spacing = width / 5;
  catEngineers = [
    { x: spacing * 1, y: height * 0.55, type: 'white',  speed: 0.15, offset: 0 },
    { x: spacing * 2, y: height * 0.55, type: 'calico', speed: 0.12, offset: 2 },
    { x: spacing * 3, y: height * 0.55, type: 'orange', speed: 0.18, offset: 5 },
    { x: spacing * 4, y: height * 0.55, type: 'grey',   speed: 0.10, offset: 7 }
  ];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let spacing = width / 5;
  catEngineers.forEach((cat, i) => {
    cat.x = spacing * (i + 1);
    cat.y = height * 0.55;
  });
}

function draw() {
  // 1. 繪製鏡像影像
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 70); 
  image(video, 0, 0, width, height);
  pop();

  // 2. 溫馨房間背景風格
  noStroke();
  fill(255, 248, 220, 150); 
  rect(0, 0, width, height * 0.7);
  fill(235, 210, 185); 
  rect(0, height * 0.7, width, height * 0.3);
  
  // 畫個溫馨小窗戶
  fill(255, 255, 255, 180);
  rect(width * 0.1, height * 0.1, 100, 120, 10);
  stroke(93, 64, 55, 80);
  line(width * 0.1 + 50, height * 0.1, width * 0.1 + 50, height * 0.1 + 120);
  line(width * 0.1, height * 0.1 + 60, width * 0.1 + 100, height * 0.1 + 60);

  // 3. 繪製貓咪、辦公桌與電腦
  catEngineers.forEach(cat => {
    let bobbing = sin(frameCount * cat.speed + cat.offset) * 5;
    
    // 畫小書桌
    noStroke();
    fill(180, 130, 90); 
    rect(cat.x - 70, cat.y + 40, 140, 20, 5);
    fill(140, 100, 70); 
    rect(cat.x - 60, cat.y + 60, 10, height * 0.7 - (cat.y + 60));
    rect(cat.x + 50, cat.y + 60, 10, height * 0.7 - (cat.y + 60));

    // 畫筆記型電腦與滾動程式碼
    fill(200); 
    rect(cat.x + 10, cat.y + 5, 45, 35, 3); 
    fill(40); 
    rect(cat.x + 13, cat.y + 8, 39, 29);
    fill(220); 
    quad(cat.x + 10, cat.y + 40, cat.x + 55, cat.y + 40, cat.x + 65, cat.y + 48, cat.x + 5, cat.y + 48);
    
    if (frameCount % 10 < 7) {
      fill(100, 255, 100); 
      rect(cat.x + 16, cat.y + 12, random(10, 25), 3);
      rect(cat.x + 16, cat.y + 18, random(15, 30), 3);
      rect(cat.x + 16, cat.y + 24, random(5, 20), 3);
    }

    // 繪製馬克杯小貓咪本體
    drawOfficeCat(cat.x - 20, cat.y + bobbing, cat.type);
    
    if (bobbing > 0) {
      fill(255, 182, 193);
      ellipse(cat.x + 5, cat.y + 38 + bobbing, 6, 6); 
      ellipse(cat.x + 12, cat.y + 38 + bobbing, 6, 6); 
    }
  });

  // 4. 頂部題目區域
  noStroke();
  fill(255, 253, 208, 220); 
  rect(50, 20, width - 100, 80, 25);
  
  fill(230, 186, 149); 
  triangle(70, 20, 100, 20, 85, -10); 
  triangle(width - 70, 20, width - 100, 20, width - 85, -10); 

  let qData = questions[currentQ];
  if (qData) {
    fill(93, 64, 55); 
    textSize(windowWidth * 0.02);
    textAlign(LEFT, CENTER);
    text(`題目: ${qData.q}`, 80, 60);

    textAlign(RIGHT, CENTER);
    fill(216, 67, 21); 
    text(`得分: ${score}`, width - 80, 60);
  }

  // 5. 顯示三個選項
  let optColors = ['#FFCC80', '#FFE082', '#FFF59D'];
  let btnWidth = width * 0.28;
  textAlign(CENTER, CENTER);
  if (qData) {
    qData.opts.forEach((opt, i) => {
      let xPos = width * (0.05 + i * 0.31);
      stroke(93, 64, 55, 100); 
      strokeWeight(2);
      fill(optColors[i]);
      rect(xPos, height - 100, btnWidth, 70, 20);
      
      noStroke();
      fill(93, 64, 55); 
      textSize(windowWidth * 0.018);
      // 畫面上貼心標示引導：(比 1)、(比 2)、(比 3)
      text(`選項 ${i+1}: ${opt}`, xPos + btnWidth / 2, height - 65);
      
      drawPaw(xPos + 30, height - 110, 15);
    });
  }

  // 6. 手勢偵測核心邏輯 (已徹底重構)
  if (predictions.length > 0) {
    let keypoints = predictions[0].keypoints;
    let count = getFingerCount(keypoints);

    // 顯示目前偵測到的數字
    fill(255, 138, 101); 
    textSize(50);
    textAlign(CENTER, CENTER);
    text(`妳出了: ${count}`, width / 2, height * 0.3);
    drawPaw(width / 2, height * 0.3 + 60, 30); 

    let now = millis();
    // 嚴格限制：只有在比出 1, 2, 3 且冷卻時間過後才觸發判定
    if (count >= 1 && count <= 3 && (now - lastActionTime > cooldown) && qData) {
      // 直覺對照：玩家比出的數字(count) 直接比對 CSV 的正確答案(qData.ans)
      if (count === qData.ans) {
        feedback = "喵！答對了 🐾";
        score += 10;
      } else {
        feedback = "嗚...答錯了 😿";
      }
      lastActionTime = now;
      currentQ = (currentQ + 1) % questions.length;
    }
  }

  // 7. 顯示回饋文字
  if (millis() - lastActionTime < 1500) {
    fill(255, 255, 255, 220);
    rect(width/2 - 150, height/2 - 50, 300, 100, 20);
    fill(93, 64, 55);
    textSize(40);
    textAlign(CENTER, CENTER);
    text(feedback, width / 2, height / 2);
  }
}

// 動態繪製馬克杯貓咪
function drawOfficeCat(x, y, type) {
  push();
  translate(x, y);
  stroke(40); 
  strokeWeight(3.5);
  
  let bodyColor = color(255);
  if (type === 'orange') bodyColor = color(255, 200, 120);
  if (type === 'grey') bodyColor = color(180);
  
  fill(bodyColor);
  rect(0, 10, 55, 45, 18);
  rect(50, 32, 15, 12, 5);
  
  noStroke();
  if (type === 'calico') { 
    fill(60); rect(0, 10, 18, 15, 10); 
    fill(255, 160, 60); rect(35, 12, 20, 20, 10); 
  }
  if (type === 'orange') { 
    fill(240, 140, 50);
    rect(5, 20, 12, 4);
    rect(40, 25, 12, 4);
  }
  
  stroke(40);
  strokeWeight(3.5);
  fill(bodyColor);
  triangle(5, 12, 18, 12, 10, -2); 
  triangle(37, 12, 50, 12, 45, -2); 
  
  fill(40);
  noStroke();
  ellipse(20, 22, 3.5, 5); 
  ellipse(35, 22, 3.5, 5); 
  
  stroke(40);
  strokeWeight(2);
  line(27, 21, 27, 25); 
  
  pop();
}

function drawPaw(x, y, size) {
  push();
  fill(255, 182, 193); 
  noStroke();
  ellipse(x, y, size * 1.2, size);
  ellipse(x - size * 0.5, y - size * 0.4, size * 0.4);
  ellipse(x - size * 0.2, y - size * 0.6, size * 0.4);
  ellipse(x + size * 0.2, y - size * 0.6, size * 0.4);
  ellipse(x + size * 0.5, y - size * 0.4, size * 0.4);
  pop();
}

// 高精準度手指計數演算法
function getFingerCount(lm) {
  let count = 0;
  
  // 1. 偵測四大長指 (食指、中指、無名指、小指)
  // 指尖 y 座標低於指關節 y 座標，代表手指直立伸出
  if (lm[8].y < lm[6].y) count++;   // 食指
  if (lm[12].y < lm[10].y) count++; // 中指
  if (lm[16].y < lm[14].y) count++; // 無名指
  if (lm[20].y < lm[18].y) count++; // 小指
  
  // 2. 修正大拇指判定 (大拇指水平移動特性的防誤觸機制)
  // 當比出 1 (食指) 或 2 (食中指) 時，大拇指通常貼近手掌，應予以忽略以避免干擾。
  // 只有當四隻手指都伸出時，才去額外計算大拇指。
  if (count === 3 || count === 4) {
    if (dist(lm[4].x, lm[4].y, lm[17].x, lm[17].y) > dist(lm[3].x, lm[3].y, lm[17].x, lm[17].y)) {
      count++;
    }
  }
  
  return count;
}