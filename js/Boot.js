// Spelets första scene. Startar Preloader direkt.
// Hit kan du lägga saker som måste vara klara INNAN assets laddas —
// t.ex. spara/ladda ett highscore från localStorage.

export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    this.scene.start('Preloader');
  }
}