import { Scene3D, PhysicsLoader, Project, ExtendedObject3D } from 'enable3d';
import * as THREE from 'three'

export class ThreePhysicsComponent extends Scene3D {
  group: any
  facePoints: any
  constructor() {
    super()

    this.facePoints = JSON.parse(localStorage.getItem('meshData') as string) as any[][]
   
  }

  async init() {
    
    
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

  }

  async preload() {

  }
  makeFaceObject() {
    this.facePoints = JSON.parse(localStorage.getItem('meshData') as string) as any[][]

    this.group = new THREE.Group()
    this.group.position.x = 0
    this.group.position.y = +10

    this.facePoints.forEach((eachPoint) => {
      this.group.add(this.add.sphere({ radius: 2, x: eachPoint[0] - 275, y: eachPoint[1] - 120, z: eachPoint[2] -100 }, { lambert: { color: 'black' } }) as any);
    })
    
    this.add.existing(this.group)
    this.group.scale.x = .05
    this.group.scale.y = .05
    this.group.scale.z = .05
    this.group.rotateZ(+9.4)
    this.group.rotateY(-.1)
    this.group.rotateX(.1)
    console.log(this.group.position.x, this.group.position.y + 10)
    this.camera.position.set(this.group.position.x, this.group.position.y + 10, -40)
    
  }
  
  async create() {
    // set up scene (light, ground, grid, sky, orbitControls)
    this.warpSpeed('orbitControls', 'light', 'sky', 'ground');
    
    this.makeFaceObject();
    this.scene.children.forEach((eachOne)=>{
      if(eachOne.name === 'ground'){
        eachOne.remove(eachOne);
        // this.scene.remove(eachOne)
      }
      
    })

    // position camera
     // this.camera.position.set(0, 20, 0)

    //this.haveSomeFun()
    // enable physics debug
    if (this.physics.debug) {
      // this.physics.debug.enable()
    }


  }

  update() {

  }

}

// set your project configs
const config = { scenes: [ThreePhysicsComponent], antialias: true, gravity: { x: 0, y: -1, z: 0 } }
PhysicsLoader('/ammo', () => new Project(config))
