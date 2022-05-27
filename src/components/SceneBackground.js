import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js'
import Utils from './Utils.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
// import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

// import {mergeBufferAttributes} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// import Grass from './SceneGrass.js'
// import GrassTexture from '../res/env/grass.jpg'
// import softboxHDR from '../res/hdr/ALM2_Softbox_Fabric_Octagon.exr'
import artistHDR from '../res/hdr/artist_workshop_1k.hdr'
import courtHDR from '../res/hdr/footprint_court_2k.hdr'
import royalHDR from '../res/hdr/royal_esplanade_1k.hdr'
import sunsetHDR from '../res/hdr/venice_sunset_1k.hdr'

let skyboxCycle = Utils.cycle([artistHDR, courtHDR, royalHDR, sunsetHDR])

import smallTree from '../res/objects/SmallTree.glb'
import FresnelShader from "./FresnelShader.js";

let gridColor = 0x000000;
let randoColor = null;
let sceneBG = null;

const floorSize = 100000
const debug = false

class SceneBackground {
	constructor(scene, bgObject, bgColor, statusMethod) {
		this.scene = scene || null;
		this.bgColor = bgColor || null;
		this.bgObject = bgObject;
		this.gridColor = 0xffffff;
		this.gltf = null;
		this.mixer = null;
		this.statusMethod = statusMethod || null;
		this.floor = null
		this.loop = false

		this.floorGroup = new THREE.Group();

		// console.log("bgcolor", this.bgColor)
		this.init()
	}

	init() {
		// add grass
		// const floorGrass = new Grass(this.scene)



		if (this.bgColor === "random") {
			// console.log("do it")

		} else if (this.bgColor === "randomLoop") {
			// console.log("set fog", this.scene.fog)

			this.loop = true
			// console.log("init scene", this.loop)
			this.loopBackgroundColor()
		} else {
			// console.log('bg color', this.bgColor)
			this.bgColor = this.bgColor ? this.bgColor : Utils.isNight() ? 0x222222 : 0x222222

			this.scene.background = new THREE.Color(this.bgColor);
			this.scene.fog = new THREE.Fog(this.bgColor, floorSize/3, floorSize/2);
		}

		// setup grid environment
		// console.log("bg", bgColor)
		// this.scene.fog = new THREE.FogExp2( bgColor,);


		// var grid = new THREE.GridHelper( 6000, 100, gridColor, gridColor );
		this.grid = new THREE.GridHelper( floorSize, 1000, this.gridColor, this.gridColor );
		this.grid.material.opacity = .1;
		this.grid.material.transparent = true;
		this.grid.name = "grid";
		this.scene.add(this.grid);

		// Floor
		const shadowMaterial = new THREE.ShadowMaterial()
		shadowMaterial.opacity = 0.05;
		// const shadowMaterial = new THREE.MeshNormalMaterial()

		// var ground = new THREE.Mesh( groundGeo, groundMat );
		this.floor = new THREE.Mesh( new THREE.PlaneBufferGeometry( floorSize, floorSize ), shadowMaterial );

		this.floor.name = "floor"
		this.floor.position.y = 0
		this.floor.rotation.x = -Math.PI/2
		this.floor.receiveShadow = true
		this.scene.add(this.floor)

		// grass disc
		// const circleGeometry = new THREE.CircleGeometry(floorSize/2, 24 );

		// const grassTexture = new THREE.TextureLoader().load(GrassTexture);
		// grassTexture.wrapS = THREE.RepeatWrapping;
		// grassTexture.wrapT = THREE.RepeatWrapping;
		// grassTexture.repeat.set(100, 100);
		// const circleMaterial = new THREE.MeshBasicMaterial({ color: 0x6EBF8B, map: grassTexture });

		// const circle = new THREE.Mesh( circleGeometry, circleMaterial );

		// // circleMaterial.color.convertSRGBToLinear()
		// circle.rotation.x = -Math.PI/2
		// circle.position.y = -10;
		// this.scene.add( circle );


		// lights
		const enableLights = true
		if (enableLights) {

			const helperSize = 100
			const lightScale = 300

			const ambiLight = new THREE.AmbientLight(0xcccccc, 1) // soft white light scene.add( light );
			this.scene.add(ambiLight)

			// hemi light
			const hemiLight = new THREE.HemisphereLight(0xFFEECC, 0x808080, .2)
			// const hemiLight = new THREE.HemisphereLight(0x77DDFF, 0xFFCC99, .2)
			hemiLight.position.set(0, 0, 0)
			// this.scene.add(hemiLight)

			// point lights
			const pointLight1 = new THREE.PointLight(0xffffff, .25, 0)
			pointLight1.position.set(0, 2, 0)
			pointLight1.position.multiplyScalar(lightScale)


			const pointLight2 = new THREE.PointLight(0xffffff, .25, 0)
			pointLight2.position.set(1, 2, 1)
			pointLight2.position.multiplyScalar(lightScale)


			const pointLight3 = new THREE.PointLight(0xffffff, .25, 0)
			pointLight3.position.set(-1, -2, -1)
			pointLight3.position.multiplyScalar(lightScale)


			// this.scene.add(pointLight1, pointLight2, pointLight3)


			// direction light
			// const dirLight = new THREE.DirectionalLight(0x808080, 1)
			// dirLight.position.set(-1, 2, 1)
			// dirLight.position.multiplyScalar(200)

			// // shadows for directionallight
			// // dirLight.castShadow = true;
			// // dirLight.shadow.mapSize.width = 512;
			// // dirLight.shadow.mapSize.height = 512;
			// // dirLight.shadow.radius = 2;

			// // const d = 300;

			// // dirLight.shadow.camera.left = -d
			// // dirLight.shadow.camera.right = d
			// // dirLight.shadow.camera.top = d
			// // dirLight.shadow.camera.bottom = -d

			// // dirLight.shadow.camera.far = 1000
			// // dirLight.shadow.bias = 0.0005

			// this.scene.add(dirLight)

			// directional lights
			const dirLight1 = new THREE.DirectionalLight(0xcccccc, .8)
			dirLight1.position.set(0, 2, 0)
			dirLight1.position.multiplyScalar(lightScale)
			// dirLight1.scale.multiplyScalar(lightScale)

			const dirLight2 = new THREE.DirectionalLight(0xcccccc, .8)
			dirLight2.position.set(1, 2, 1)
			dirLight2.position.multiplyScalar(lightScale)
			// dirLight2.scale.multiplyScalar(lightScale)

			const dirLight3 = new THREE.DirectionalLight(0xcccccc, .8)
			dirLight3.position.set(-1, -2, -1)
			dirLight3.position.multiplyScalar(lightScale)
			// dirLight3.scale.multiplyScalar(lightScale)

			this.scene.add(dirLight1, dirLight2, dirLight3)
		}

		// helpers
		// //ADD CUBE
		// const boxGeometry = new THREE.BoxGeometry(20, 20, 20);
		// const boxMaterial = new THREE.MeshBasicMaterial({ color: '#433F81' });
		// let cube = new THREE.Mesh(boxGeometry, boxMaterial);
		// // cube.position.set( 0, 0, 0 );
		// cube.position.set( 0, 160, 0 );
		// this.scene.add( cube );

		if (debug) {
			let hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, helperSize)
			this.scene.add(hemiLightHelper)

			const pointLightHelper1 = new THREE.PointLightHelper(pointLight1, helperSize)
			const pointLightHelper2 = new THREE.PointLightHelper(pointLight2, helperSize)
			const pointLightHelper3 = new THREE.PointLightHelper(pointLight3, helperSize)
			this.scene.add(pointLightHelper1, pointLightHelper2, pointLightHelper3)

			const dirLightHelper1 = new THREE.DirectionalLightHelper(dirLight1, helperSize)
			const dirLightHelper2 = new THREE.DirectionalLightHelper(dirLight2, helperSize)
			const dirLightHelper3 = new THREE.DirectionalLightHelper(dirLight3, helperSize)
			this.scene.add(dirLightHelper1, dirLightHelper2, dirLightHelper3);
		}

		if (this.bgObject) {
			this._loadGLTF(this.bgObject, (mesh) => {
				sceneBG = mesh
				this.scene.add(mesh)
			})
		}


		// get background environment
		// const fileName = `grass-draco.glb`
		// const storageRef = Storage.ref().child(`${'environments/'}${fileName}`);

		// storageRef.getDownloadURL().then((downloadURL) => {
		// 	// console.log("environment download url", name, downloadURL)
		// 	this._loadBackgroundEnvironment(downloadURL, (mesh) => {
		// 		mesh.position.y = -50
		// 		this.scene.add(mesh)
		// 	})

		// }).catch((error) => {
		// 	console.log("no environment", name);
		// 	reject()
		// })

		this.cycleSkybox()
	}

	unmount = () => {
		this.loop = false
	}

	loopBackgroundColor = () => {
		// stop the loop

		if (!this.loop) return
		console.log("loop scene", this.loop)
	}

	addOutdoor = (envBbox) => {
		// return
		this._removeSceneContent(this.floorGroup)

		const outdoor = [smallTree]

		const outdoorArray = [...Array(Utils.randomNumber(16, 32, true)).keys()]

		const glbPromise = this.loadGLB(Utils.randomChoice(outdoor)).then(object => {
			outdoorArray.forEach((i) => {
				const clonedObject = object.clone()
				const bbox = new THREE.Box3().setFromObject(clonedObject);
				const geoSize = new THREE.Vector3()
				bbox.getSize(geoSize)
				// console.log("geo", bbox, geoSize)

				const padding = 100
				const randomObjectScale = Utils.randomNumber(100, 200)

				const boundFactorX = envBbox.z + (geoSize.x * randomObjectScale) + padding
				const boundFactorZ = envBbox.x + (geoSize.x * randomObjectScale) + padding
				let boundFactor = Math.max(boundFactorX, boundFactorZ)
				const randomGroupRotation = Utils.randomNumber(0, Math.PI*2)
				// const randomGroupRotation = (Math.PI*2)/(outdoorArray.length)*i

				const randomGroupOffset = Utils.randomNumber(boundFactor, boundFactor*2, true);

				const objectGroup = new THREE.Group()
				objectGroup.name = "parent"
				objectGroup.add(clonedObject)
				clonedObject.position.x = randomGroupOffset
				// object.position.y = geoSize.y/2;
				// object.position.z = Utils.randomNumber(boundFactorZ, boundFactorZ*2, true) * Utils.randomChoice([-1, 1]);
				objectGroup.rotation.y = randomGroupRotation

				// clonedObject.castShadow = true;
				// clonedObject.receiveShadow = true;

				this.floorGroup.add(objectGroup);

				clonedObject.scale.set(0, 0, 0)
				clonedObject.rotation.set(Utils.randomNumber(-Math.PI/2, Math.PI/2), 0, Utils.randomNumber(-Math.PI/2, Math.PI/2))

				const newBoxScale = new THREE.Vector3().setScalar(Utils.randomNumber(100, 200))
				const newBoxRotation = new THREE.Vector3(0, Utils.randomNumber(0, Math.PI * 2), 0)
				const duration = Utils.randomNumber(1000, 2500)
				const delay = Utils.randomNumber(1000, 2000)

				new TWEEN.Tween(clonedObject.rotation)
					.to( newBoxRotation, duration + 500)
					.delay(delay)
					.easing(TWEEN.Easing.Exponential.Out)
					.start()

				new TWEEN.Tween(clonedObject.scale)
					.to( newBoxScale, duration)
					.delay(delay)
					.easing(TWEEN.Easing.Exponential.Out)
					.start()
			})
		})


		this.scene.add(this.floorGroup)
	}

	updateBG = (environment) => {
		// console.log("new env", environment)
		// load new background

	}

	loadGLB = (file) => {
		return new Promise(resolve => {
			const loader = new GLTFLoader();

			loader.load(file, (gltf) => {
				let materials = []
				let geometries = []
				let mergedGeometry = new THREE.BufferGeometry()
				let meshMaterial

				gltf.scene.traverse( (child) => {
					if (child.isMesh) {
						// child.castShadow = true;
						// child.receiveShadow = true;

						// child.material.metalness = 0;
						// child.material = new THREE.MeshNormalMaterial();
						if (Utils.isNight()) {
							child.material = new THREE.MeshDepthMaterial()
						} else {
							child.material = new THREE.MeshDepthMaterial()

							// child.material = new THREE.MeshToonMaterial({
							// 	color: 0x333333,
							// })
						}
						// child.material = new FresnelShader({
						// 	color1: new THREE.Color(0xff4444),
						// 	color2: new THREE.Color(0x4444ff),
						// 	scale: 1.4,
						// 	power: 1
						// })


						// child.material.needsUpdate = true
						// // merge mesh things
						// child.updateMatrix();
						// geometries.push(child.geometry);
						// materials.push(child.material);
						// console.log("push", child)
					}
				})

				// gltf.scene.parent = object;
				// gltf.scene.scale.setScalar(0.01);
				// const geo = gltf.scene.children[0].geometry.scale(1, 1, 1);

				// box helper
				// const geometry = new THREE.BoxGeometry(.5, .5, .5);
				// const material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
				// const cube = new THREE.Mesh( geometry, material );
				// gltf.scene.attach(cube);

				// console.log(gltf.scene)
				gltf.scene.name = "gltfGroup"
				let geo = gltf.scene.children[0]

				// merge if multiple meshes
				// if (gltf.scene.children.length > 1) {
				// 	mergedGeometry = mergeBufferGeometries(geometries, true);
				// 	mergedGeometry.groupsNeedUpdate = true;
				// 	geo = new THREE.Mesh(mergedGeometry, materials);
				// }
				resolve(geo);
			},
				// called while loading is progressing
				(xhr) => {
					// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
					if (xhr.loaded === xhr.total) {
						console.log('done loading peter')
					}
				},
				// called when loading has errors
				(error) => {
					console.log( 'An error happened', error );
				}
			);
		});
	}

	_loadGLTF = (url, cb) => {
		// load preset body
		const loader = new GLTFLoader();

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( '/draco/' );
		loader.setDRACOLoader(dracoLoader);

		const ktx2Loader = new KTX2Loader();
		ktx2Loader.setTranscoderPath( '/basis/' );
		// ktx2Loader.detectSupport( renderer );
		loader.setKTX2Loader(ktx2Loader);

		// Load a glTF resource
		loader.load(url, (gltf) => {
			gltf.scene.traverse((child) => {

				if ( child.isMesh ) {
					// child.castShadow = true;
					// child.receiveShadow = true;
					// child.material.metalness = 1;

					if (Utils.isNight()) {
					// 	child.material.metalness = 1;
					} else {
					// 	child.material.metalness = .4;
					}
				}
			})

			this.gltf = gltf;

			this.playAnimations(this.gltf);

			gltf.scene.name = "object_scene";

			cb(gltf.scene);
		},
			// called while loading is progressing
			(xhr) => {
				// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
				if (xhr.loaded === xhr.total) {
					console.log('done loading gltf')
				}
			},
			// called when loading has errors
			(error) => {
				console.log( 'An error happened', error );
			}
		);
	}

	_loadBackgroundEnvironment = (url, cb) => {
		// load preset body
		const loader = new GLTFLoader();

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( '/draco/' );
		loader.setDRACOLoader(dracoLoader);

		const ktx2Loader = new KTX2Loader();
		ktx2Loader.setTranscoderPath( '/basis/' );
		// ktx2Loader.detectSupport( renderer );
		loader.setKTX2Loader(ktx2Loader);

		// Load a glTF resource
		loader.load(url, (gltf) => {
			gltf.scene.traverse((child) => {

				if (child.isMesh) {
					if (child.name.toLowerCase().includes("tree")) {
						// console.log("child.name", child.name.toLowerCase().includes("tree"))
						child.visible = false
						// gltf.scene.remove(child)
					}
					// child.castShadow = true;
					// child.receiveShadow = true;
					// child.material.metalness = 1;

					if (Utils.isNight()) {
						child.material = new THREE.MeshDepthMaterial()
					} else {
						// child.material = new THREE.MeshDepthMaterial()

						child.material = new THREE.MeshToonMaterial({
							color: 0x050505
						})
						// child.material = new FresnelShader({
						// 	color1: new THREE.Color(0xff4444),
						// 	color2: new THREE.Color(0x4444ff),
						// 	scale: 1.4,
						// 	power: 1
						// })
					}
				}
			})

			this.gltf = gltf;

			this.playAnimations(this.gltf);

			gltf.scene.name = "object_scene";

			cb(gltf.scene);
		},
			// called while loading is progressing
			(xhr) => {
				// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
				if (xhr.loaded === xhr.total) {
					console.log('done loading gltf')
				}
			},
			// called when loading has errors
			(error) => {
				console.log( 'An error happened', error );
			}
		);
	}


	playAnimations() {
		if (this.gltf && this.gltf.animations && this.gltf.animations[0]) {
			this.mixer = this.mixer || new THREE.AnimationMixer(this.gltf.scene);

			this.gltf.animations.forEach((clip) => {
				this.mixer.clipAction(clip).play();
			})
		}
	}

	updateMixer(delta) {
		if (this.mixer) this.mixer.update(delta);
	}

	_pulseObject = (object) => {
		object.traverse( child => {
			if (child.materials) {
				console.log(child, child.materials)
				// child.materials[0].transparent = true;
				// child.materials[0].opacity = 1 + Math.sin(new Date().getTime() * .0025);//or any other value you like
				// child.visible = false;
			}
			return
		});
	}

	_hideObject = (object) => {
		object.traverse( child => {
			// if (child instanceof THREE.Mesh) {
			if (child.isMesh) {
				child.visible = false;
			}
			return
		});
	}

	removeGrid = () => {
		this.scene.remove(this.grid);
	}

	addGrid = () => {
		this.scene.add(this.grid);
	}

	destroy = () => {
		console.log("scenebg", sceneBG)
		if (sceneBG) {
			this.scene.remove(sceneBG);
		}
		this.scene.fog = null
		this.scene.background = new THREE.Color(0xFFFFFF);
		this.loop = false
	}

	_destroyContent = (thing) => {
		thing.traverse(child => {
			if (child.isMesh) {
				// console.log(nestedChild.isMesh, nestedChild)
				child.geometry.dispose()
				child.material.dispose()
			}
		})

		this.scene.remove(thing)
	}

	// _removeSceneContent = (group) => {
	// 	if (group) {
	// 		// this.contentGroup.remove(...this.contentGroup.children);
	// 		// console.log('group', group)
	// 		group.children.forEach((child, i) => {

	// 			if (child.type === "Group") {
	// 				// console.log(child.type)
	// 				this._removeSceneContent(child)
	// 			} else {
	// 				this._destroyContent(child)
	// 				group.remove(child)
	// 			}
	// 		})
	// 	}
	// }

	cycleSkybox = (group) => {
		const HDR = skyboxCycle()

		new RGBELoader().load(HDR, (texture) => {
			texture.mapping = THREE.EquirectangularReflectionMapping;
			// this.scene.background = texture;
			this.scene.environment = texture;
		})
	}

	_removeSceneContent = (group) => {
		if (group) {
			// this.contentGroup.remove(...this.contentGroup.children);
			// console.log('group', group)
			group.children.forEach((child, i) => {
				// const box = child.clone()

				// const offsetDistance = Utils.randomNumber(400, 800)
				// box.translateOnAxis(new THREE.Vector3(0, 1, 0), offsetDistance)
				// const newBoxPosition = new THREE.Vector3(box.position.x, box.position.y, box.position.z);

				const newBoxScale = new THREE.Vector3(0, 0, 0)
				const newBoxRotation = new THREE.Vector3(Utils.randomNumber(-Math.PI/2, Math.PI/2), 0, Utils.randomNumber(-Math.PI/2, Math.PI/2))
				const delay = Utils.randomNumber(0, 500)
				const duration = Utils.randomNumber(500, 800)

				if (child.name === "parent" && child.children[0]) {
					new TWEEN.Tween( child.children[0].rotation)
						.to( newBoxRotation, duration)
						.easing(TWEEN.Easing.Exponential.In)
						.start();

					new TWEEN.Tween(child.children[0].scale)
						.to(newBoxScale, duration)
						.easing(TWEEN.Easing.Exponential.InOut)
						.delay(delay)
						.onComplete(() => {
							this._removeSceneContent(child)

							this._destroyContent(child)
							group.remove(child)
						})
						.start();
				} else {
					if (child.type === "Group") {
						this._removeSceneContent(child)
						this._destroyContent(child)
						group.remove(child)
					} else {
						this._destroyContent(child)
						group.remove(child)
					}

				}

			})
		}
	}


}

export default SceneBackground;