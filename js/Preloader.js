// Laddar alla externa assets. Startar Game-scenen när allt är klart.
// Lägg till fler this.load.*-anrop här i takt med att spelet växer:
//   this.load.image('weapon', 'assets/weapon.png')
//   this.load.audio('shot',   'assets/shot.mp3')

export default class Preloader extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
  }

  preload() {
    // Enkel laddningstext — syns bara om filen tar tid att ladda
    this.add.text(
      this.scale.width  / 2,
      this.scale.height / 2,
      'Laddar...',
      { fontFamily: 'Courier New', fontSize: '16px', color: '#c9c4b8' }
    ).setOrigin(0.5);

    this.load.audio('music', 'assets/Doom2026Music.mp3');
    this.load.audio('shoot', 'assets/shoot.mp3');
    this.load.audio('ouch',  'assets/ouch.mp3');
  }

  create() {
    this.scene.start('Game');
  }
}