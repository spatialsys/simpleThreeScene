import * as THREE from 'three';

import Utils from './Utils.js';
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import TWEEN from '@tweenjs/tween.js'

const friction = 0.85;
const bounce = 0.2;

let dragging = false;

let position = new THREE.Vector3()
let previous = new THREE.Vector3()
let velocity = new THREE.Vector3()
let clock = new THREE.Clock();
let clockDelta = 0;

class ObjectControls extends DragControls {
	constructor(_objects, _camera, _domElement, _controls, _parentFunction) {
		super(_objects, _camera, _domElement);

		this.objects = _objects
		this.controls = _controls
		this.parentGoToArtworkFunction = _parentFunction
		this.camera = _camera
		this.xz = true
		this.isHovering = null
		this.isLightbox = null

		// console.log("construct", this.objects, _objects, _camera, _domElement)
		// this.objects = []
		// this._objects = this.objects

		this.add = (object, draggable = true) => {
			// console.log("first", this.getObjects())
			object.draggable = draggable
			this.objects.push(object)
			// console.log("second", this.getObjects())
		}

		this.remove = (index) => {
			// console.log("first", this.getObjects())
			this.objects.splice(index, 1)
		}

		// // this.transformGroup = true;
		// // domElement.addEventListener( 'drag', domElement );
		// this.addEventListener( 'pointerdown', (event) => {
		// 	// event.preventDefault();

		// 	console.log("pointer down", event.button, this.xz)
		// 	if (event.button === 0) {
		// 		this.xz = true;
		// 	} else {
		// 		this.xz = false;
		// 	}
		// });

		// _domElement.addEventListener( 'contextmenu', (event) => {
		// 	console.log("right click down", event.button, this.xz)
		// 	event.preventDefault();
		// });

		// _domElement.addEventListener( 'pointerdown', function (event) {
		// 	_domElement.style.cursor = 'grabbing';
		// 	console.log("mouse down")
		// })

		// _domElement.addEventListener( 'pointerup', function (event) {
		// 	_domElement.style.cursor = 'grab';
		// 	console.log("mouse up")
		// })

		let worldPositionStart;
		let touchStart

		// add these to handle mouse movement since the dispatched events don't send mouse movement
		let moved = false

		_domElement.addEventListener('mousedown', function(event) {
			// console.log("down", event.movementX, event.movementY)
			moved = false
		})

		_domElement.addEventListener('mousemove', function(event) {
			// console.log("move", event.movementX, event.movementY, Math.hypot(event.movementX, event.movementY))
			if (Math.hypot(event.movementX, event.movementY) > 1) {
				moved = true
			}
		})

		// _domElement.addEventListener('mouseUp', function(event) {
		// 	console.log("object control up", event.movementX, event.movementY)
		// 	moved = false
		// })

		// window.addEventListener('mouseup', function(event) {
		// 	if (moved) {
		// 		console.log('moved')
		// 	} else {
		// 		console.log('not moved')
		// 	}
		// })

		_domElement.addEventListener('touchstart', function(event) {
			// console.log("object controls touch start", event)

			moved = false
			touchStart = event.touches[0];
		})

		_domElement.addEventListener('touchmove', function(event) {
			// console.log("object controls touch move", event)
			const touch = event.touches[0];

			event.movementX = touch.pageX - touchStart.pageX;
			event.movementY = touch.pageY - touchStart.pageY;

			const delta = Math.hypot(event.movementX, event.movementY)

			if (delta > 1) {
				moved = true
			}
		})


		// _domElement.addEventListener('touchend', function(event) {
		// 	console.log("object controls touch end", event)

		// 	// moved = false
		// 	// touchStart = event.touches[0];
		// })

		this.addEventListener('dragstart', function(event) {
			this.isHovering = true //handle touch event where there isnt hover
			// console.log('drag start', this.isHovering, event)
			// console.log("dragstart", event.object.position)

			// _domElement.style.cursor = "grab !important"
			// console.log("event", event.object, this.getObjects())
			// console.log('drag')
			// console.log("dragstart", this.xz)

			worldPositionStart = event.object.position.clone()

			if (event.object.draggable) {
				this.controls.enabled = false;
			}
		})

		this.addEventListener('dragend', function(event) {
			const delta = worldPositionStart.distanceTo(event.object.position)
			// console.log("dragend", delta, event)

			// disambig click vs drag
			if (delta < 5 && !moved) {
				// this is a click

				this.isLightbox = true
				this.parentGoToArtworkFunction(event.object)
				// if camera is facing back of object, dont lightbox
				// const isFacingBack = Math.PI/2 < event.object.quaternion.angleTo(this.camera.quaternion) ? true : false
				// console.log("face", Math.PI/2, event.object.quaternion.angleTo(this.camera.quaternion), isFacingBack)
				// if (!isFacingBack) {
				// 	console.log("is facing forward", isFacingBack)
				// } else {
				// 	console.log("is facing back", isFacingBack)
				// }
			} else {
				// this is defined as a drag but handles inertia if dragging
				// position.set(event.object.position.x, event.object.position.y, event.object.position.z)
				// velocity = previous.distanceTo(event.object.position)
				const maxVelocity = new THREE.Vector3(60, 60, 60)
				const minVelocity = maxVelocity.clone().negate()

				const clampedVelocity = velocity.clone().clamp(minVelocity, maxVelocity)
				const displacement = clampedVelocity.clone().multiplyScalar(1000).divideScalar(20)
				// console.log("v", clampedVelocity, maxVelocity)
				const currentPosition = event.object.position.clone()
				// v = pixels / ms
				// vS = pixels / ms * 1000
				const newPosition = currentPosition.clone().add(displacement)

				// cancel if it's still tweening
				if (event.object.tween && event.object.tween.isPlaying()) {
					event.object.tween.stop()
					TWEEN.remove(event.object.tween)
				}

				const tween = new TWEEN.Tween( event.object.position)
					.to( newPosition, 1000 )
					.easing(TWEEN.Easing.Exponential.Out)
					.start();

				event.object.tween = tween
				// console.log("end velocity", velocity, clampedVelocity)
			}

			// console.log("dragend", event.object.position)
			this.controls.enabled = true;
			// this.xz = true;
		});

		this.addEventListener('drag', (event) => {
			// console.log("drag", event)
			if (!event.object.draggable) {
				event.object.position.copy(worldPositionStart)
				return
			}

			_domElement.style.cursor = 'move';

			// console.log("drag", event)
			clockDelta = clock.getDelta()
			position.copy(event.object.position)
			velocity.copy(event.object.position).sub(previous).divideScalar(clockDelta).divideScalar(1000)

			previous.copy(position)

			// lock y
			// if (this.xz) {
			// 	// plane.setFromNormalAndCoplanarPoint( normal, _worldPosition.setFromMatrixPosition( object.matrixWorld ) );
			// 	event.object.position.y = worldPositionStart.y;
			// 	console.log(this.controls.getPolarAngle())
			// }

			if (this.controls.getPolarAngle() < 1) {
				// plane.setFromNormalAndCoplanarPoint( normal, _worldPosition.setFromMatrixPosition( object.matrixWorld ) );
				event.object.position.y = worldPositionStart.y;
				// console.log(this.controls.getPolarAngle())
			}

		});

		this.intersectObjectWithRay = ( object, raycaster, includeInvisible ) => {
			const allIntersections = raycaster.intersectObject( object, true );

			for ( let i = 0; i < allIntersections.length; i ++ ) {
				if ( allIntersections[ i ].object.visible || includeInvisible ) {
					return allIntersections[ i ];
				}
			}

			return false;
		}


		// const draggableObjects = this.getObjects();
		// let objectSelection = null;

		this.addEventListener('hoveron', (event) => {
			this.isHovering = true
			// console.log("hovering on", _domElement.style.cursor, _domElement.classList)

			// const isFacingBack = Math.PI/2 < event.object.quaternion.angleTo(this.camera.quaternion) ? true : false
			// console.log("face", Math.PI/2, event.object.quaternion.angleTo(this.camera.quaternion), event.object.quaternion.dot(this.camera.quaternion), isFacingBack)
			// // console.log("dot", this.camera.quaternion.dot(event.object.quaternion))

			// if (isFacingBack) {
			// 	_domElement.style.cursor = "grab !important"
			// 	// _domElement.classList.add("grab")
			// }

		// 	// console.log("hover", draggableObjects, this.getObjects(), objects)
		// 	if (event.object.parent && event.object.parent.name.includes("_object")) {

		// 		objectSelection = event.object.parent
		// 		// console.log(objectSelection)
		// 		// console.log(event.object.name)
		// 	} else if (event.object.parent && event.object.parent.parent && event.object.parent.parent.name.includes("_object")){
		// 		objectSelection = event.object.parent.parent
		// 	} else {
		// 		objectSelection = event.object
		// 	}

		// 	draggableObjects.length = 0;
		// 	this.transformGroup = true;
		// 	group.attach(objectSelection);
		// 	draggableObjects.push(group);

		// 	// console.log("hover", this.getObjects().length, objects)

		});


		this.addEventListener('hoveroff', (event) => {
			this.isHovering = false
			// console.log("hovering off", _domElement.style.cursor, _domElement.classList)

			// _domElement.style.cursor = "grab !important"
			// _domElement.classList.remove("grab")

		// 	// reset
		// 	this.transformGroup = false;
		// 	draggableObjects.length = 0;
		// 	// scene.attach(event.object);
		// 	scene.attach(objectSelection);
		// 	draggableObjects.push(...initObjects);
		});
	}

	_tweenCamera = ( newCameraPosition, newTargetPosition, duration ) => {
		// todo: garbage collect tweens and stop tweens if someone is tryna move cam

		// this.controls.enabled = false;
		const cameraPosition = new THREE.Vector3().copy( this.camera.position );
		const targetPosition = new THREE.Vector3().copy( this.controls.target );

		// console.log([cameraPosition, newCameraPosition, targetPosition, newTargetPosition, duration])

		new TWEEN.Tween( cameraPosition, this.tweenCameraGroup )
			.to( newCameraPosition, duration )
			.easing( TWEEN.Easing.Exponential.Out )
			.onUpdate(() => {
				// console.log('tweening', this.camera.fov);
				this.camera.position.copy( cameraPosition );
			})
			.onComplete(() => {
				this.camera.position.copy( newCameraPosition );
			})
			.start();

		new TWEEN.Tween( targetPosition, this.tweenCameraGroup )
			.to( newTargetPosition, duration )
			.easing( TWEEN.Easing.Exponential.Out )
			.onUpdate(() => {
				this.camera.lookAt( targetPosition );
				this.controls.target = targetPosition;
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
	}

}

export default ObjectControls;

