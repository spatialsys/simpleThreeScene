import * as React from "react";

import * as THREE from 'three';

import Stats from 'stats.js';
import Utils from './Utils.js';

import TeleportControls from './TeleportControls'
import ObjectControls from './ObjectControls'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

import SceneBackground from './SceneBackground.js';

import TWEEN from '@tweenjs/tween.js'

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let moved, dragged;
let initialAvatarPosition
let initialized = false

let targetCameraHeight = 13;
const positionFactor = 100
const scaleFactor = 100

const multiLevelTeleport = false

class Scene extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			init: false,
			status: null,
			content: null,
			selectedArtwork: null,
			artworkPositions: [],
			artwork: [],
			cameraTarget: 0,
			avatars: {},
			faceCamera: true,
			renderedAvatars: {},
			mousePosition: null
		};
	}

	componentDidMount() {
		console.log('scene mountin');

		this.tweenCameraGroup = new TWEEN.Group();

		THREE.Cache.enabled = true;

		this.threeStats = new Stats();
		this.threeStats.dom.id = 'StatsDiv';
		this.threeStats.dom.style.position = null;
		if (this.props.showDebug) {
			this.refs.stats.appendChild(this.threeStats.dom);
			// this.threeStats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
		}

		const width = this.mount.clientWidth
		const height = this.mount.clientHeight

		//ADD SCENE
		this.mixer = null;
		this.clock = new THREE.Clock();

		this.scene = new THREE.Scene();
		// console.log("scene ready");

		//ADD CAMERA
		this.camera = new THREE.PerspectiveCamera(35, width / height, 1, 5000000);
		// this.camera.near = 1;
		this.camera.position.set(50, 50, -50)
		// this.helper = new THREE.CameraHelper(this.camera);
		// this.scene.add(this.helper);

		// this.camera.position.set(0, 10, 100);
		// this.camera.zoom = .001;

		// clip planes
		this.clipPlanes = [
			new THREE.Plane(new THREE.Vector3(1, 0, 0 ), 0),
			new THREE.Plane(new THREE.Vector3(0, -1, 0 ), 10),
			new THREE.Plane(new THREE.Vector3(0, 0, -1 ), 0)
		]

		//ADD RENDERER
		this.renderer = new THREE.WebGLRenderer({
			alpha: false,
			antialias: false,
			xrCompatible: false,
			powerPreference: 'high-performance'

		});

		this.renderer.localClippingEnabled = true;

		this.renderer.setPixelRatio( Math.min(window.devicePixelRatio, !Utils.isMobile() ? 2 : 1.25) );
		this.renderer.setSize(width, height);
		this.renderer.xr.enabled = false;
		this.renderer.outputEncoding = THREE.sRGBEncoding;

		this.renderer.shadowMap.enabled = true;
		this.renderer.domElement.id = "ThreeCanvas"

		this.mount.appendChild(this.renderer.domElement)

		// controls
		this.controls = new TeleportControls(this.camera, this.renderer.domElement);
		this.objectControls = new ObjectControls([], this.camera, this.renderer.domElement, this.controls, this.goToArtworkObjectFromClick)

		// init
		this.start()

		// if there's a bg, go to normal orbit for splash
		this.sceneBG = new SceneBackground(this.scene, this.props.bg, this.props.bgColor);

		if (this.props.autoRotate) {
			this._autoRotateScene(2);
		}

		// add resize
		window.addEventListener('resize', this.onWindowResize, true);
	}

	componentDidUpdate(prevProps, prevStates) {

		if (this.state.status !== prevStates.status && this.state.status) {
			this.props.parentStatusMethod ? this.props.parentStatusMethod(this.state.status) : null
		}

		if (this.props.showDebug !== prevProps.showDebug) {
			const span = document.getElementById("StatsDiv");

			if (this.threeStats.dom.contains(span)) {
				this.refs.stats.removeChild(this.threeStats.dom);
			} else {
				this.refs.stats.appendChild(this.threeStats.dom);
			}
		}
	}

	componentWillUnmount() {
		console.log('scene unmounting');

		this.stop()
	}

	_destroyContent = (thing) =>{
		thing.traverse(child => {
			if (child.isMesh) {
				// console.log(nestedChild.isMesh, nestedChild)
				child.geometry.dispose()
				child.material.dispose()
			}
		})
	}

	_removeSceneContent = (group) => {
		if (group) {
			// this.contentGroup.remove(...this.contentGroup.children);
			// console.log('group', group)
			group.children.forEach((child, i) => {

				const box = child.clone()

				const offsetDistance = Utils.randomNumber(400, 800)
				box.translateOnAxis(new THREE.Vector3(0,0,1), offsetDistance)
				const newBoxPosition = new THREE.Vector3(box.position.x, box.position.y, box.position.z);

				const newBoxScale = new THREE.Vector3(0, 0, 0)
				const delay = Utils.randomNumber(0, 500)

				new TWEEN.Tween( child.position)
					.to( newBoxPosition, Utils.randomNumber(500, 800))
					.easing(TWEEN.Easing.Exponential.InOut)
					.delay(delay)
					.start();

				// new TWEEN.Tween( box.rotation)
				// 	.to( newBoxRotation, 3000 )
				// 	.easing(TWEEN.Easing.Exponential.Out)
				// 	.start();

				new TWEEN.Tween( child.scale)
					.to( newBoxScale, Utils.randomNumber(500, 800))
					.easing(TWEEN.Easing.Exponential.InOut)
					.delay(delay)
					.onComplete(() => {
						this._destroyContent(child)
						group.remove(child)

						if (group == this.contentGroup) {
							this.objectControls.remove(i) //todo should make this more like a object filter
						}
					})
					.start();
			})
		}
	}

	_initContentGroup() {
		// console.log("init content group", this.contentGroup)
		if (!this.contentGroup) {
			this.contentGroup = new THREE.Group();
			this.contentGroup.name = "ContentGroup"

			this.scene.add(this.contentGroup);
		} else {
			this._removeSceneContent(this.contentGroup)
		}
		// zero out the selectedArt
		this.setState({selectedArtwork: null})
	}


	_autoRotateScene = (speed=4) => {
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = speed;
		// this.controls.enablePan = false;
		// this.controls.minPolarAngle = Math.PI * .2;
		// this.controls.maxPolarAngle = Math.PI / 1.4;
	}


	handleCameraMovement = (e) => {
		// console.log('handling', this.controls.target, this.state.renderedAvatars)


		// handle clip planes
		this.clipPlanes.forEach((plane, i) => {
			if (i === 1) return

			const normal = new THREE.Vector3(); // normal
			const coplanarPoint = new THREE.Vector3(); //coplanar point - for re-use

			const targetPos = this.controls.target.clone();
			const camPos = this.camera.position.clone();
			// somewhere in animation loop or anywhere else further
			normal.subVectors(camPos, targetPos)

			// turn this on if you want clipping planes to just go straight up instead of with camera orbit
			// if (this.controls.getPolarAngle() > .5) {
			// 	normal.y = 0
			// }

			// mod to blend the cut off to top at a certain angle
			const normalY = normal.y
			normal.y = Utils.modulate(this.controls.getPolarAngle(), [.25, .5], [normalY, 0])
			// console.log("polar angle", this.controls.getPolarAngle(), normal.y)

			// reverse one of the arrays so it intersects
			const negFactor = i === 0 ? 1 : -1
			normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), negFactor * Math.PI/4)
			normal.normalize().negate(); //reverse the normal so it clips

			const normalOffset = normal.clone().multiplyScalar(1)

			plane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, 0, 0));
			plane.translate(targetPos.sub(normalOffset))
		})

		// this.controls.target.y = Utils.mapRange(this.controls.distance(), this.controls.minDistance, this.controls.maxDistance, targetCameraHeight, 0);
		// this.camera.fov = Utils.mapRange(this.controls.distance(), this.controls.minDistance, this.controls.maxDistance, 100, 80);
		// this.camera.updateProjectionMatrix();

		// // handle camera distance and near factor (turning off since i do this with clip planes now)
		// // console.log("cam near", this.controls, this.camera, this.props.selectedArtwork)
		// if (this.props.selectedArtwork) {
		// 	if (this.contentGroup.children && this.state.selectedArtwork && this.contentGroup.children[this.state.selectedArtwork.index]) {
		// 		this.camera.near = Math.max(this.controls.distance() - 200, 1)
		// 	}

		// } else {
		// 	if (!Utils.isUserAgent("snap")) {
		// 		this.camera.near = Utils.modulate(this.controls.distance(), [this.controls.minDistance, this.controls.maxDistance], [0, this.controls.maxDistance/2])
		// 	}
		// }

		// just handle normal clipping
		this.camera.near = Utils.modulate(this.controls.distance(), [this.controls.minDistance, this.controls.maxDistance], [50, this.controls.maxDistance/10])

		this.camera.fov = Utils.modulate(this.controls.distance(), [this.controls.minDistance, this.controls.maxDistance], [35, 22])
		this.camera.updateProjectionMatrix();
	}

	start = () => {
		// if (!this.frameID) {
		// 	this.frameID = requestAnimationFrame(this.animate)
		// }
		this.renderer.setAnimationLoop(this.animate)

	}

	stop = () => {
		this.renderer.setAnimationLoop(null)

		// console.log("scene remove", this.scene)
		this.scene = null;
		this.camera = null;
		this.controls = null;

		this.sceneBG.unmount()
		this.sceneBG = null;

		if (this.renderer.domElement) {
			this.mount.removeChild(this.renderer.domElement)
		}
	}

	animate = () => {
		const delta = this.clock.getDelta()

		if (this.props.showDebug) {
			this.threeStats.begin()
		}
		this.controls.update() // only required if controls.enableDamping = true, or if controls.autoRotate = true

		// update avatar label positions in screenspace
		if (this.state.renderedAvatars) {
			// console.log("labeling")
			Object.keys(this.state.renderedAvatars).forEach((key, i, array) => {
				// console.log("render", key, i, array)
				// this.state.renderedAvatars[key].animateFace(this.clock.oldTime);
				return this.state.renderedAvatars[key].updateAnimations(delta);
			})
		}

		// update tween/mixer animations
		TWEEN.update()
		if (this.tweenCameraGroup) this.tweenCameraGroup.update()
		if (this.sceneBG) this.sceneBG.updateMixer(delta)

		this.renderScene()

		if (this.props.showDebug) {
			this.threeStats.end()
		}
	}

	renderScene = () => {
		this.renderer.render(this.scene, this.camera)
	}

	onWindowResize = () => {
		// console.log("this mount", this.mount, this.mount.clientWidth, this.mount.clientHeight);
		if (this.mount) {
			// console.log("resize")
			var width = this.mount.clientWidth;
			var height = this.mount.clientHeight;

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height);
		}
	}

	render() {
		return(
				<div
					className={`full ${this.props.className}`}
					id="scene"
					// tabIndex="-1"
					ref={(mount) => { this.mount = mount }}
					onMouseDown={this.getMouseDown.bind(this)}
					onMouseUp={this.getMouseUp.bind(this)}
					onMouseMove={this.getMouseMove.bind(this)}
					// onMouseLeave={this.resetMousePosition.bind(this)}
				>
					<div
						ref="stats"
						className="fixed left-0 bottom-0 mb2 ml2"
					>
					</div>
				</div>
		)
	}


	// handle click to teleport
	getMouseDown = (event) => {
		moved = false;
		dragged = true;
		// console.log('down', moved)
		// overide cursor from object controls

		// console.log("mouse down", this.renderer.domElement.style.cursor, this.renderer.domElement.classList)
		this.renderer.domElement.style.cursor = 'grabbing';
		initialAvatarPosition = this.controls.target.clone()
	}

	isDragged = () => {
		return dragged && moved ? true : false
	}

	getMouseUp = (event) => {
		// console.log("mouse up", dragged, moved)
		dragged = false;
		// console.log('up', moved)
		// overide cursor from object controls
		this.renderer.domElement.style.cursor = 'grab';
		// console.log('mouse up fire', event, moved)

		if (moved) {
			// console.log('moved / dragged, so do nada')
			if (this.props.autoCam) {
				this.props.parentCloseFunction(false)
			}
		} else {
			// update the picking ray with the camera and mouse position
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

			raycaster.setFromCamera(mouse, this.camera);
			raycaster.near = this.camera.near
			// console.log("cast", raycaster.near, this.camera.near)

			// calculate objects intersecting the picking ray (this.scene.children will ray cast everything)
			// const intersects = raycaster.intersectObjects(this.scene.children)

			// this will just do the floor teleport casting by ignoring it if it's hovering

			const intersects = raycaster.intersectObject(multiLevelTeleport ? this.gltf.scene : this.sceneBG.floor)
			// console.log("mouse up intersects", intersects[0], this.objectControls.isHovering)
			if (intersects[0] && !this.objectControls.isHovering) {
				if (this.props.autoCam || this.props.selectedArtwork) {
					// handle case where you want to exit a light box
					// console.log("clicked raycast", (intersects[0] && !this.objectControls.isHovering), (this.props.selectedArtwork || this.props.autoCam), this.controls.getDistance())
					this.props.parentCloseFunction()
				} else {
					// todo: handle if you go to far
					const targetIntersect = multiLevelTeleport ? intersects.find(obj => obj.face.normal.y > .3) : intersects[0]
					// console.log("target", targetIntersect)
					if (!targetIntersect) return

					const targetPosition = new THREE.Vector3(targetIntersect.point.x, targetIntersect.point.y, targetIntersect.point.z)
					const targetCameraPosition = new THREE.Vector3(targetIntersect.point.x, multiLevelTeleport ? targetIntersect.point.y : targetCameraHeight, targetIntersect.point.z)

					// offset the camera from target and lerp it
					const offsetCameraPosition = this._getCameraOffsetFromVector(targetPosition, this.camera.quaternion.clone(), this.controls.getDistance())
					const cameraPosition = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z).lerp(offsetCameraPosition, 0.25)

					const angle = Utils.getAngleTo(this.controls.target, targetPosition)
					// console.log("teleport", this.controls.getDistance(), angle)

					const cameraDuration = 2000
					this._tweenCamera(cameraPosition, targetCameraPosition, cameraDuration);
				}

			}

		}


		// ***important this will break mobile touch if we dont reset object controls here
		// since isHovering fires on touch but doesnt ever reset since hovering doesnt exist
		// on mobile(has to be here since this event fires last)
		if (Utils.isMobile()) {
			this.objectControls.isHovering = false
		}
		// for ( let i = 0; i < intersects.length; i ++ ) {
		// 	intersects[ i ].object.material.color.set( 0xff0000 );
		// }
	}

	getMouseMove = (event) => {
		// console.log("mouse move", event ,event.movementX, event.movementY)

		if (Math.hypot(event.movementX, event.movementY) > 1) {
			moved = true
		}

		// handle cursors
		// console.log("drag", dragged, this.objectControls.isHovering)
		if (dragged) {
			this.renderer.domElement.style.cursor = 'grabbing';
		} else {
			if (this.objectControls.isHovering) {
				this.renderer.domElement.style.cursor = 'pointer';
			} else {
				this.renderer.domElement.style.cursor = 'grab';
			}
		}
	}

	resetMousePosition = (event) => {
		this.setState({mousePosition: null})
	}

	
	stopCameraTweens = () => {
		this._garbageCollectTweens(this.tweenCameraGroup)
	}

	_garbageCollectTweens = (group) => {
		// console.log("garbage collecting", group.getAll().length)
		if (group) {
			group.getAll().forEach((tween) => {
				tween.stop()
				group.remove(tween)
			})
		}
	}

	goToBbox = (sceneBbox) => {
		// this inits just exiting current position by an offset to make it feel liek you closed something
		let targetPosition = new THREE.Vector3(this.controls.target.x, targetCameraHeight, this.controls.target.z)
		let cameraPosition = this._getCameraOffsetFromObject(this.camera, Utils.randomNumber(400, 700)).add(new THREE.Vector3(0, targetCameraHeight, 0))

		// if there's a bbox, change the target and cam to fit it
		if (sceneBbox) {
			const worldPosition = new THREE.Vector3()
			sceneBbox.getWorldPosition(worldPosition)
			worldPosition.y = targetCameraHeight

			const worldScale = new THREE.Vector3()
			sceneBbox.getWorldScale(worldScale)

			const bboxSize = new THREE.Vector3()
			sceneBbox.geometry.boundingBox.getSize(bboxSize)
			// bboxSize.multiply(sceneBbox.scale)

			const bboxCenter = new THREE.Vector3()
			sceneBbox.geometry.boundingBox.getCenter(bboxCenter)
			bboxCenter.multiply(sceneBbox.scale).add(sceneBbox.position)

			const boundingRadius = Math.max(Math.min(Math.abs(bboxSize.x/2), Math.abs(bboxSize.y/2), Math.abs(bboxSize.z/2)), Utils.randomNumber(400, 600))

			// hack if x is too negative then just use 0
			targetPosition = new THREE.Vector3(Math.max(sceneBbox.position.x, 0) + Utils.randomNumber(-200, 200), targetCameraHeight, sceneBbox.position.z + Utils.randomNumber(-200, 200))
			// targetPosition = new THREE.Vector3(bboxCenter.x, targetCameraHeight, bboxCenter.z)
			// console.log("bbox", sceneBbox.position, bboxCenter, bboxSize, targetPosition)
			cameraPosition = new THREE.Vector3(boundingRadius * (Math.random() < 0.5 ? -1 : 1), targetCameraHeight * 4, boundingRadius * (Math.random() < 0.5 ? -1 : 1))
			// console.log("radius world pos", cameraPosition, sceneBbox, bboxCenter, boundingRadius, worldPosition)

			// console.log("go to bbox", sceneBbox.position, sceneBbox.geometry.boundingSphere.radius)
			// console.log("tar", targetPosition, sceneBbox.geometry.boundingSphere.radius)
			// const testBox = this._createBox(100, 100, 100)
			// const testBoxZero = this._createBox(100, 100, 100)
			// testBox.position.copy(worldPosition)
		}

		this._tweenCamera(cameraPosition, targetPosition, 3000);
	}

	goToDollhouse = (length=1) => {
		// console.log('going to dollhouse', length, this.props.people);
		this._garbageCollectTweens(this.tweenCameraGroup)

		const avatarShoulderWidth = 20;
		let radius = Math.max(80, (avatarShoulderWidth * length*3)/(2 * Math.PI));
		let height = targetCameraHeight + (length/2 * 16)

		if (this.props.people) {
			length = Object.keys(this.props.people).length;
			const theta = avatarShoulderWidth * length;
			const spiralRadius = 16 * Math.sqrt(theta);

			if (length >= 10) {
				radius = spiralRadius/2;
				height = spiralRadius/3;
			}
			if (length >= 15) {
				radius = spiralRadius/2;
				height = spiralRadius/4;
			}
		} else if (this.props.customEnvironment) {
			console.log("customEnvironment")
		}

		console.log("go to doll")
		const cameraOffset = this.props.roomID ? 400000 : 300

		const cameraAvatarPosition = new THREE.Vector3(radius - cameraOffset, height + cameraOffset, radius + cameraOffset);
		const targetAvatarPosition = new THREE.Vector3(0, height, 0);

		const cameraPosition = new THREE.Vector3().copy(cameraAvatarPosition);
		const targetPosition = new THREE.Vector3().copy(targetAvatarPosition);
		const duration = 2000;

		this._tweenCamera( cameraPosition, targetPosition, duration );
	}

	goToSnap = () => {
		return new Promise((resolve, reject) => {
			this._garbageCollectTweens(this.tweenCameraGroup)

			console.log("start snap", this.environmentGroup.children[0] && this.environmentGroup.children[0].bbox, this.contentGroup.children.length)
			const diameter = this.environmentGroup.children[0] ? this.environmentGroup.children[0].bbox.geometry.boundingSphere.radius * 2 : 200
			const boxRadius = this.environmentGroup.children[0] ? this.environmentGroup.children[0].bbox.geometry.boundingBox.max : 200

			const height = 300

			// this.controls.target.set(0, height/2, boxRadius.z/2)
			// targetPosition = new THREE.Vector3(Utils.randomNumber(0, 100), targetCameraHeight, Utils.randomNumber(0, 100))
			const xOrZ = Utils.randomChoice([false, true])
			const negFactor = Utils.randomChoice([-1, 1])
			let rotation


			if (xOrZ) {
				this.controls.target.set(boxRadius.x/3 * negFactor, height/2, 0)
			} else {
				this.controls.target.set(0, height/2, boxRadius.z/3 * negFactor)
			}

			this.camera.position.set(0, height, 0)
			console.log("this", this.controls.target, this.camera.position)
			const quaternion = new THREE.Quaternion().setFromUnitVectors(this.camera.position, this.controls.target)
			// const euler = new THREE.Euler().setFromVector3(this.controls.target)
			const euler = new THREE.Euler().setFromQuaternion(quaternion)

			const angle = new THREE.Vector3().copy(this.camera.position).angleTo(this.controls.target)

			const targetCameraPosition = this._getCameraOffsetFromVector(this.controls.target, quaternion, 1000)
			// console.log("target", targetCameraPosition, this.controls.target)
			this.camera.position.copy(targetCameraPosition)




			// this.camera.position.set(diameter, height, diameter)
			// this.camera.near = Math.max(this.controls.distance() - (diameter/3), 1)

			console.log("snap finish")
			resolve()
		})
	}


	getIndexByID = (id) => {
		// console.log("contentGroup", this.contentGroup.children[0])
		return this.contentGroup.children.findIndex( child => child.assetID === id );
	}

	_getIndexByName = (name) => {
		return this.contentGroup.children.findIndex( child => child.name === name );
	}


	goToObject = (object) => {
		if (!object) return

		const objectWorldPosition = new THREE.Vector3()
		const objectWorldRotation = new THREE.Quaternion()
		const objectWorldScale = new THREE.Vector3()

		object.getWorldPosition(objectWorldPosition)
		object.getWorldQuaternion(objectWorldRotation)
		object.getWorldScale(objectWorldScale)

		// console.log("click", object, object.geometry.parameters.width, object.geometry.parameters.height)
		// thank this dude https://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
		const padding = 0;
		const scaleFactor = Math.min(objectWorldScale.x, objectWorldScale.y, objectWorldScale.z)
		// console.log('selected', this.props.selectedArtwork)
		const detailPanelWidthOffset = !Utils.isMobile() ? 400 : 0

		const aspect = (this.mount.clientWidth - detailPanelWidthOffset) / this.mount.clientHeight
		const w = (object.geometry.parameters.width * scaleFactor) + padding;
		const h = (object.geometry.parameters.height * scaleFactor) + padding;

		const fovX = this.camera.fov * aspect;
		const fovY = this.camera.fov;

		const distanceX = (w / 2) / Math.tan(Math.PI * fovX / 360) + (w / 2);
		const distanceY = (h / 2) / Math.tan(Math.PI * fovY / 360) + (w / 2);

		const distance = Math.max(distanceX, distanceY)

		const newTargetPosition = this._getCameraOffsetFromVector(objectWorldPosition, objectWorldRotation, 300)
		const newCameraPosition = this._getCameraOffsetFromVector(objectWorldPosition, objectWorldRotation, distance)

		// console.log('vectors', distance, objectWorldPosition, objectWorldRotation)
		// console.log("wassup", object, newCameraPosition, newTargetPosition)
		this._tweenCamera(newCameraPosition, newTargetPosition, Utils.randomNumber(1000, 3000))


	}



	_getCameraOffsetFromObject = (object, offset=500) => {
		if (!object) return
		const tempBox = object.clone()
		tempBox.translateOnAxis(new THREE.Vector3(0,0,1), offset)
		const offsetPosition = tempBox.position.clone()
		tempBox.remove()
		return offsetPosition
	}

	_getCameraOffsetFromVector = (vector, quaternion, offset=500) => {
		if (!vector || !quaternion) return

		const boxGeo = new THREE.BoxGeometry(1,1,1);
		const tempBox = new THREE.Mesh(boxGeo, new THREE.MeshNormalMaterial());
		tempBox.position.copy(vector)
		tempBox.quaternion.copy(quaternion)

		tempBox.translateOnAxis(new THREE.Vector3(0,0,1), offset)
		const offsetPosition = tempBox.position.clone()
		tempBox.remove()
		return offsetPosition
	}


	_tweenCameraRotation(targetQuaternion, duration){
		// const targetOrientation = new THREE.Quaternion().set(0, 0, 0, 1).normalize();

		// gsap.to({}, {
		//     duration: 2,
		//     onUpdate: function() {
		//         camera.quaternion.slerp(targetOrientation, this.progress());
		//     }
		// });
		const cameraQuaternion = new THREE.Quaternion().copy( this.camera.quaternion );

	    new TWEEN.Tween( cameraQuaternion )
	    	.to(targetQuaternion, duration)
	        .easing( TWEEN.Easing.Quadratic.InOut )
	        .onUpdate((progress) => {
	            this.camera.quaternion.slerp(targetQuaternion, cameraQuaternion)
				// this.camera.rotation.setFromQuaternion( qm );
	    })
	    .start();
	}



	_tweenCamera = (newCameraPosition, newTargetPosition, duration, ease=TWEEN.Easing.Exponential.Out) => {
		// todo: garbage collect tweens and stop tweens if someone is tryna move cam
		this._garbageCollectTweens(this.tweenCameraGroup)

		// this.controls.enabled = false;
		const cameraPosition = new THREE.Vector3().copy( this.camera.position );
		const targetPosition = new THREE.Vector3().copy( this.controls.target );

		// console.log([cameraPosition, newCameraPosition, targetPosition, newTargetPosition, duration])

		return new Promise((resolve, reject) => {
			new TWEEN.Tween( this.camera.position, this.tweenCameraGroup )
				.to(newCameraPosition, duration)
				.easing(ease)
				.onUpdate(() => {
					// console.log('tweening');
					// this.camera.position.copy( cameraPosition );
				})
				.onComplete(() => {
					// this.camera.position.copy( newCameraPosition );
					resolve()
				})
				.start();

			new TWEEN.Tween(targetPosition, this.tweenCameraGroup)
				.to(newTargetPosition, duration)
				.easing(ease)
				.onUpdate(() => {
					this.camera.lookAt( targetPosition );
					this.controls.target = targetPosition;
					this.controls.update();

					// if you want cool zoom mapping
					// this.controls.target.y = Utils.mapRange(this.controls.distance(), this.controls.minDistance, this.controls.maxDistance, targetCameraHeight, 0);
				} )
				.onComplete(() => {
					this.camera.lookAt( newTargetPosition );
					// if i want the cool zoom mapping
					// this.controls.target.y = Utils.mapRange(this.controls.distance(), this.controls.minDistance, this.controls.maxDistance, targetCameraHeight, 0);
					this.controls.target = newTargetPosition;
					// this.controls.enabled = true;
					this.controls.update();
				} )
				.start();
		})

	}

	_tweenCameraLinear = (newCameraPosition, newTargetPosition, duration) => {
		this._garbageCollectTweens(this.tweenCameraGroup)

		return new Promise((resolve, reject) => {
			const cameraPosition = new THREE.Vector3().copy( this.camera.position );
			const targetPosition = new THREE.Vector3().copy( this.controls.target );

			// console.log([cameraPosition, newCameraPosition, targetPosition, newTargetPosition, duration])

			new TWEEN.Tween( this.camera.position, this.tweenCameraGroup )
				.to( newCameraPosition, duration )
				.easing( TWEEN.Easing.Linear.None )
				.start();

			new TWEEN.Tween( targetPosition, this.tweenCameraGroup )
				.to( newTargetPosition, duration )
				.easing( TWEEN.Easing.Linear.None )
				.onUpdate(() => {
					this.camera.lookAt( targetPosition );
					this.controls.target = targetPosition;
					this.controls.update();

				} )
				.onComplete(() => {
					this.camera.lookAt( newTargetPosition );
					this.controls.target = newTargetPosition;
					this.controls.update();
					resolve()
				} )
				.start();
		})
	}

	_createBox(x=200, y=200, z=200) {
		console.log("creating box")
		const boxGeo = new THREE.BoxGeometry(x, y, z);
		const boxMesh = new THREE.Mesh(boxGeo, new THREE.MeshNormalMaterial());
		this.scene.add(boxMesh)
		return boxMesh
	}



	_loadImageIntoMaterial = (imageURL, material) => {
		if (!imageURL) {
			console.log('texture error', material.name, imageURL, material.map)
			return
		}

		this._formatCoolTextureURL(imageURL).then(textureURL => {
			// console.log('image texture', textureURL)
			const loader = new THREE.TextureLoader()
			loader.load(
				textureURL,
				// onLoad callback
				(texture) => {
					const delay = this.tweenCameraGroup.getAll()[0] ? this.tweenCameraGroup.getAll()[0]._duration/1000 : 0

					Utils.delay(delay, () => {
						texture.wrapS = material.map.wrapS
						texture.wrapT = material.map.wrapT
						texture.flipY = material.map.flipY
						texture.encoding = material.map.encoding
						// texture.source = material.map.source

						texture.matrix = material.map.matrix
						texture.minFilter = material.map.minFilter
						texture.mapping = material.map.mapping
						texture.repeat = material.map.repeat
						texture.center = material.map.center


						material.map = texture
						material.needsUpdate = true

						// console.log('Got higher res texture', texture, material.map)
					})
				},
				undefined, //onProgress callback currently not supported
				function(error) {
					console.error('texture error happened', error)
				}
			)
		})

	}


	_loadGLTFEnvironmentArrayBuffer = (gltfArrayBuffer, cb) => {
		// todo: investigate if removing this from cache is good
		// console.log("cache", THREE.Cache.files, Object.keys(THREE.Cache.files))

		// load preset
		// https://stackoverflow.com/questions/61763757/load-gltf-file-into-a-three-js-scene-with-a-html-input
		const loader = new GLTFLoader();

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( '/draco/' );
		loader.setDRACOLoader(dracoLoader);

		const ktx2Loader = new KTX2Loader();
		ktx2Loader.setTranscoderPath( '/basis/' );
		// ktx2Loader.detectSupport( renderer );
		loader.setKTX2Loader(ktx2Loader);

		// Load a glTF resource
        loader.parse(gltfArrayBuffer, '', (gltf) => {

			this._traverseGLTFScene(gltf, true)
			this.gltf = gltf;
			// this.playAnimations(this.gltf);

			gltf.scene.name = "object_scene";
			cb(gltf.scene);
		}, (xhr) => {
		}, (error) => {
			// called when loading has errors
			console.log( 'An error happened', error );
		})
	}

	_loadGLTFEnvironment = (url, cb) => {
		// todo: investigate if removing this from cache is good
		// console.log("cache", THREE.Cache.files, url)

		// load preset body
		const loader = new GLTFLoader();

		const dracoLoader = new DRACOLoader();
		// dracoLoader.setDecoderPath( 'three/examples/js/libs/draco/' );
		dracoLoader.setDecoderPath( '/draco/' );
		loader.setDRACOLoader(dracoLoader);

		const ktx2Loader = new KTX2Loader();
		ktx2Loader.setTranscoderPath( '/basis/' );
		// ktx2Loader.detectSupport( renderer );
		loader.setKTX2Loader(ktx2Loader);

		// Load a glTF resource
		// url = "novo" //hack to force a env
		this._formatCoolEnvironmentURL(url).then(modelURL => {
			// console.log("model", modelURL)
			loader.load(modelURL, (gltf) => {
				gltf.scene.name = url
				gltf.scene.url = modelURL
				this._traverseGLTFScene(gltf, false, true)
				this.gltf = gltf;

				gltf.scene.name = "object_scene";
				cb(gltf.scene);
			}, (xhr) => {
					// called while loading is progressing
			}, (error) => {
				// called when loading has errors
				console.log( 'An error happened', error );
			})
		})

	}

	_traverseGLTFScene = (gltf, showMarker=false, progressiveTexture=false) => {
		let markers = []
		const parser = gltf.parser;

		gltf.scene.traverse((child) => {
			if (child.isMesh) {
				// console.log("gltf parse", child.name, child.name.includes("marker"))
				if (child.name.includes("marker")) {
					child.material = new THREE.MeshNormalMaterial()

					if (!showMarker) {
						child.visible = false
					} else {
						console.log("show marker", child.name)
					}

					if (child.name.toLowerCase().includes("twosided")) {
						// console.log("twosided", child.name, child)
						child.material.side = THREE.DoubleSide
					}

					if (child.name.toLowerCase().includes("threesided")) {
						console.log("threesided not supported yet", child.name, child)
					}

					markers.push(child)

					// // destroy
					// child.geometry.dispose()
					// child.material.dispose()
				}

				// check if srgb
				// if (child.material && child.material.map) {
				// 	console.log("child", child.material.map.encoding, THREE.sRGBEncoding)
				// 	// texture.encoding = THREE.sRGBEncoding
				// }

				// materials and lighting
				child.castShadow = false;
				child.receiveShadow = false;
				// child.side = THREE.DoubleSide
				// console.log("child env", child.material.roughness, child.material.metalness, child.material)

				// child.material.metalness = 0;
				// child.material.roughness = 1;

				child.material.clippingPlanes = this.clipPlanes
				child.material.clipIntersection = true
				// child.material.clipShadows = true,

				// console.log("png material", child.material)


				// progressive texture load
				// find associations uuid for texture or images, then look it up in json
				// check if texture is 512, then load a highres one if available
				if (progressiveTexture && child.material.map && child.material.map.image && child.material.map.image.width === 512 ) {
					// console.log("map uuid", child.material.map.uuid, child.material.map.image.width)
					let fullTexturePath

					// get associated texture path
					parser.associations.forEach((key, value) => {
						// if (!value.material) return
						// console.log('key', key, value, parser.json, Object.values(key), value.uuid === value.material.map.uuid)
						if (value.uuid === child.material.map.uuid) {
							let index = key.index ? key.index : Object.values(key) ? Object.values(key)[0] : null
							// console.log("mom", parser.json.images[index])

							if (!parser.json.images[index]) {
								console.log("not avail", index, key, value, parser.json.images)
								return
							}

							const extension = parser.json.images[index].mimeType.includes('png') ? "png" : "jpg"

							const texturePathSize = Utils.isMobile() ? "512" : "2048"
							fullTexturePath = `${gltf.scene.name}/${texturePathSize}/${parser.json.images[index].name}.${extension}`
							// console.log("url", child.material.name, fullTexturePath)
						}
					})

					this._loadImageIntoMaterial(fullTexturePath, child.material)
				}

			}
		})

		this._setArtworkPositions(markers)
	}


	_loadGLTF = (url, cb) => {
		// load preset body
		const loader = new GLTFLoader();

		const dracoLoader = new DRACOLoader();
		// dracoLoader.setDecoderPath( 'three/examples/js/libs/draco/' );
		dracoLoader.setDecoderPath( '/draco/' );
		loader.setDRACOLoader(dracoLoader);

		const ktx2Loader = new KTX2Loader();
		ktx2Loader.setTranscoderPath( '/basis/' );
		// ktx2Loader.detectSupport( renderer );
		loader.setKTX2Loader(ktx2Loader);

		// Load a glTF resource

		loader.load(url, (gltf) => {
			const parser = gltf.parser;
			// console.log("parser", parser.associations, parser.json)

			gltf.scene.traverse((child) => {
				// console.log("child", child)
				if (child.isMesh) {
					child.castShadow = false;
					child.receiveShadow = false;
					// child.side = THREE.DoubleSide
					// child.material.metalness = 0;

					// check if texture is 512, then load a highres one if available
					if (child.material.map && child.material.map.image && child.material.map.image.width === 512 ) {
						// console.log("map uuid", child.material.map.uuid, child.material.map.image.width)
						// find associations uuid for texture or images, then look it up in json
						// gltf.parser.associations.map

						let fullTexturePath

						parser.associations.forEach((key, value) => {
							// console.log('key', value.uuid)
							if (value.uuid === child.material.map.uuid) {
								let index = key.index ? key.index : Object.values(key) ? Object.values(key)[0] : null
								// console.log("match", child.material.name)
								// console.log("uuid", child.material.name, index, value, key, value.uuid)
								// console.log("key value", index, value, parser.json.images[index]);
								const extension = parser.json.images[index].mimeType.includes('png') ? "png" : "jpg"
								// console.log("tex file", parser.json.images[index].mimeType)

								const texturePathSize = Utils.isMobile() ? "1024" : "2048"
								fullTexturePath = `${Utils.getDirectory(url)}${Utils.getFilename(url).replace("-draco", "")}/${texturePathSize}/${parser.json.images[index].name}.${extension}`
								// console.log("url", child.material.name, fullTexturePath)
							}
						})
						// console.log("url", child.material.name, fullTexturePath)
						this._loadImageIntoMaterial(fullTexturePath, child.material)
					}

					// if (Utils.isNight()) {
					// 	child.material.metalness = 1;
					// } else {
					// 	child.material.metalness = .4;
					// }
				}
			})

			this.gltf = gltf;
			// this.playAnimations(this.gltf);

			gltf.scene.name = "object_scene";
			cb(gltf.scene);
		}, (xhr) => {
			// called while loading is progressing
			// console.log( xhr, (xhr.loaded / xhr.total * 100 ) + '% loaded' );
			// if (xhr.loaded === xhr.total) {
			// 	console.log('done loading gltf', url)
			// }
		}, (error) => {
			// called when loading has errors
			console.log( 'An error happened', error );
		})
	}

}

Scene.defaultProps = {
  parentLoadedFunction: console.log,
  parentCloseFunction: console.log,
  parentStatusMethod: console.log,
  parentSetSelectedArtworkFunction: console.log
}

export default Scene