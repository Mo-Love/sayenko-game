import { Component, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'beer' | 'vodka';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-container">
      <canvas #canvas width="400" height="300" (click)="restart()"></canvas>
      <div class="ui">
        <h1>🍺 Саєнко vs ПивоГорілка 🥃</h1>
        <p>Score: {{ score() }} | ПРОБІЛ — стрибок! Саєнко, оминаємо пляшки! 🚀</p>
        <p *ngIf="gameOver()">Game Over, Саєнко! Клікни для рестарту 😎</p>
      </div>
    </div>
  `,
  styles: [`
    .game-container { display: flex; flex-direction: column; align-items: center; 
      background: #000; color: #0f0; font-family: monospace; padding: 20px; min-height: 100vh; }
    canvas { border: 4px solid #FFD700; image-rendering: pixelated; background: #87CEEB; cursor: pointer; }
    .ui { text-align: center; margin-top: 10px; }
    h1 { margin: 0 0 10px 0; font-size: 26px; text-shadow: 0 0 10px #FFD700; }
    p { margin: 5px 0; font-size: 16px; }
  `]
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  score = signal(0);
  gameOver = signal(false);
  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  private keys: { [key: string]: boolean } = {};
  private frame = 0; // Для анімації

  // Game state
  player = { x: 50, y: 150, vy: 0, size: 16 };
  obstacles: Obstacle[] = [];
  obstacleSpeed = 3;
  gravity = 0.5;
  jumpPower = -9.5;

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);

    this.gameLoop();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }

  gameLoop() {
    this.frame++;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    if (this.gameOver()) return;

    if (this.keys['Space']) {
      this.player.vy = this.jumpPower;
      this.keys['Space'] = false;
    }

    this.player.vy += this.gravity;
    this.player.y += this.player.vy;

    if (this.player.y > 268) this.player.y = 268;
    if (this.player.y < 0) this.player.y = 0;

    if (Math.random() < 0.025) {
      const isUpper = Math.random() > 0.5;
      this.obstacles.push({
        x: 400,
        y: isUpper ? 40 : 250,
        type: isUpper ? 'vodka' : 'beer',
        w: 20,
        h: 30
      });
    }

    this.obstacles.forEach(obs => obs.x -= this.obstacleSpeed);
    this.obstacles = this.obstacles.filter(obs => obs.x > -obs.w);

    for (let obs of this.obstacles) {
      if (this.player.x < obs.x + obs.w &&
          this.player.x + this.player.size > obs.x &&
          this.player.y < obs.y + obs.h &&
          this.player.y + this.player.size > obs.y) {
        this.gameOver.set(true);
        return;
      }
    }

    this.score.set(Math.floor(this.obstacleSpeed * 10));
    this.obstacleSpeed += 0.0005;
  }

  draw() {
    // Фон: небо + хмаринки
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, 400, 300);
    // Хмаринки (прості 8-біт)
    this.ctx.fillStyle = '#FFF';
    for (let i = 0; i < 3; i++) {
      const cloudX = (this.frame * 0.5 + i * 150) % 500 - 50;
      this.ctx.fillRect(cloudX, 30 + i*20, 40, 10);
      this.ctx.fillRect(cloudX + 10, 25 + i*20, 30, 15);
    }

    // Земля
    this.ctx.fillStyle = '#228B22';
    this.ctx.fillRect(0, 284, 400, 16);
    this.ctx.fillStyle = '#006400';
    for (let i = 0; i < 400; i += 8) {
      this.ctx.fillRect(i, 284, 6, 16);
    }

    // Саєнко з анімацією (борода коливається!)
    this.drawSayenko(this.player.x, this.player.y);

    // Пляшки
    this.obstacles.forEach(obs => this.drawBottle(obs.x, obs.y, obs.type));

    // Score
    this.ctx.fillStyle = '#FFD700';
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 8;
    this.ctx.font = 'bold 22px monospace';
    this.ctx.fillText(`Score: ${this.score()}`, 10, 30);
    this.ctx.shadowBlur = 0;
  }

  private drawSayenko(x: number, y: number) {
    const s = this.player.size;
    const anim = Math.sin(this.frame * 0.2) * 1; // Легка анімація бороди

    // Голова
    this.ctx.fillStyle = '#FDBCB4';
    this.ctx.fillRect(x + 2, y + 2, s - 4, s - 6);

    // Волосся
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(x + 1, y, s - 2, 4);
    this.ctx.fillRect(x, y + 1, 3, s - 4);
    this.ctx.fillRect(x + s - 3, y + 1, 3, s - 4);

    // Очі
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(x + 4, y + 5, 2, 2);
    this.ctx.fillRect(x + 10, y + 5, 2, 2);

    // Ніс
    this.ctx.fillRect(x + 7, y + 8, 2, 3);

    // Борода (з анімацією)
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(x + 3, y + 11 + anim, 10, 5);
    this.ctx.fillRect(x + 1, y + 13 + anim, s - 2, 3);

    // Рот
    this.ctx.fillStyle = '#A52A2A';
    this.ctx.fillRect(x + 6, y + 10, 4, 1);
  }

  private drawBottle(x: number, y: number, type: 'beer' | 'vodka') {
    // Натхненний класичними спрайтами
    if (type === 'beer') {
      this.ctx.fillStyle = '#8B4513'; // Кришка
      this.ctx.fillRect(x + 2, y, 16, 4);
      this.ctx.fillStyle = '#228B22'; // Тіло
      this.ctx.fillRect(x + 3, y + 4, 14, 24);
      this.ctx.fillStyle = '#90EE90'; // Блиск
      this.ctx.fillRect(x + 5, y + 6, 3, 20);
      this.ctx.fillRect(x + 12, y + 6, 3, 20);
      this.ctx.fillStyle = '#FFD700'; // Лейбл
      this.ctx.fillRect(x + 6, y + 12, 8, 8);
    } else {
      this.ctx.fillStyle = '#000'; // Кришка горілки
      this.ctx.fillRect(x + 4, y, 12, 4);
      this.ctx.fillStyle = '#E0E0E0'; // Скло
      this.ctx.fillRect(x + 3, y + 4, 14, 24);
      this.ctx.fillStyle = '#F0F8FF'; // Блиск
      this.ctx.fillRect(x + 14, y + 6, 2, 20);
      this.ctx.fillStyle = '#D3D3D3'; // Тінь
      this.ctx.fillRect(x + 4, y + 6, 2, 20);
      this.ctx.fillStyle = '#FF69B4'; // Лейбл
      this.ctx.fillRect(x + 6, y + 14, 8, 6);
    }
  }

  restart() {
    if (this.gameOver()) {
      this.gameOver.set(false);
      this.player.y = 150;
      this.player.vy = 0;
      this.obstacles = [];
      this.obstacleSpeed = 3;
      this.score.set(0);
      this.frame = 0;
    }
  }
}
