import Moment from 'moment';

class Utils {

	static isStaging() {
		return window.location.hostname.includes("staging") || window.location.hostname.includes("localhost") || window.location.hostname.includes("itslit") ? true : false
	}

	static isLocalhost() {
		return window.location.hostname === "localhost" ? true : false;
	}

	static isUserAgent(agentName) {
		return navigator.userAgent === agentName ? true : false;
	}

	static getFilename(path) {
		return path.replace(/\.[^/.]+$/, "").replace(/^.*[\\\/]/, '')
	}

	static getDirectory(path) {
		return path.replace(/\/[^\/]+?\.[^\/]+?$/, '/')
	}

	static getExtension(path) {
		return path.split('.').pop();
	}

	static getLastSeen(timeObject, suffix=true) {
		const lastSeen = timeObject.toDate();
		const lastMoment = Moment(lastSeen);
		// const now = Moment();

		const fromNow = lastMoment.fromNow(suffix);
		// const timeDifference = lastMoment.diff(now, 'months');

		// timeSince: fromNow,
		// isActive: timeDifference === 0 ? true : false

		return fromNow;
	}

	static getAngleTo(sourceVector, targetVector) {
		const adjacent = targetVector.z - sourceVector.z
		const opposite = targetVector.x - sourceVector.x
		return Math.atan2(opposite, adjacent)
	}


	static getTimeDaysFromToday(timeObject, suffix=true) {
		if (!timeObject) return

		const a = Moment(timeObject.toDate())
		var b = Moment(new Date())
		const dayDiff = a.diff(b, 'days') // 1

		// 0 is today, -1 is yesterday
		return dayDiff;
	}



	static resizeUserPhoto(url, size=40) {
		const densitySize = size * window.devicePixelRatio

		if (url.includes("/mo")) {
			return url
		} else {
			return url.replace("/photo.jpg", `/s${densitySize}-c/photo.jpg`);
		}
	}

	static isMobile() {
		let checkMobile = /Android|webOS6|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		return checkMobile;
	}

	static delay(time, f) {
		const timer = setTimeout(f, time * 1000)
		return timer
	}


	static throttle(delay, fn) {
		if (delay === 0) { return fn; }
		delay *= 1000;
		let timer = false;

		return () => {
			if (timer) { return; }
			timer = true;
			if (delay !== -1) { setTimeout((() => timer = false), delay); }
			return fn(...arguments);
		}
	}

	static debounce(threshold, fn, immediate) {
		if (threshold == null) { threshold = 0.1; }
		let timeout = null;
		threshold *= 1000;

		return function(...args) {
			const obj = this;
			const delayed = function() {
				if (!immediate) { fn.apply(obj, args); }
				return timeout = null;
			};
			if (timeout) {
				clearTimeout(timeout);
			} else if (immediate) {
				fn.apply(obj, args);
			}
			return timeout = setTimeout(delayed, threshold);
		}
	}

	static isDayOrNight() {
		let date = new Date();
		let hours = date.getHours();

		if (hours > 6 && hours < 18)
			// day
			return "day"
		else
			// night
			return "night"
	}

	static isNight() {
		let date = new Date();
		let hours = date.getHours();

		if (hours > 6 && hours < 18)
			// day
			return false
		else
			// night
			return true
	}

	static brightenRGB(col, amt) {

		let usePound = false;

		if (col[0] === "#") {
			col = col.slice(1);
			usePound = true;
		}

		let num = parseInt(col, 16);

		let r = (num >> 16) + amt;

		if (r > 255) r = 255;
		else if  (r < 0) r = 0;

		let b = ((num >> 8) & 0x00FF) + amt;

		if (b > 255) b = 255;
		else if  (b < 0) b = 0;

		let g = (num & 0x0000FF) + amt;

		if (g > 255) g = 255;
		else if (g < 0) g = 0;

		return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);

	}

	static round(value, decimals, increment=null, min=null, max=null) {

		if (decimals == null) { decimals = 0; }
		const d = Math.pow(10, decimals);

		if (increment) { value = Math.round(value / increment) * increment; }
		value = Math.round(value * d) / d;

		if (min && (value < min)) { return min; }
		if (max && (value > max)) { return max; }
		return value;
	}

	static genUID() {
		// Math.random should be unique because of its seeding algorithm.
		// Convert it to base 36 (numbers + letters), and grab the first 9 characters
		// after the decimal.
		return Math.random().toString(36).substr(2, 9);
	}

	static randomColor() {
		return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
	}

	// see https://stackoverflow.com/questions/30143082/how-to-get-color-value-from-gradient-by-percentage-with-javascript
	static pickRGB(color1, color2, weight) {
		var w1 = weight;
		var w2 = 1 - w1;
		var rgb = [
			Math.round(color1[0] * w1 + color2[0] * w2),
			Math.round(color1[1] * w1 + color2[1] * w2),
			Math.round(color1[2] * w1 + color2[2] * w2)
		]
		return rgb;
	}


	static randomChoice(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

	// # Return a random number between a and b
	static randomNumber(a=0, b=1, integer=false) {
		const randomNumber = this.mapRange(Math.random(), 0, 1, a, b);
		return integer ? this.round(randomNumber) : randomNumber
	}

	static arrayFromArguments(args) {
		// Convert an arguments object to an array
		if (Array.isArray(args[0])) return args[0]
		return Array.prototype.slice.call(args)
	}

	static cycle() {
		// # Returns a function that cycles through a list of values with each call.
		let args = this.arrayFromArguments(arguments)

		let curr = -1
		return function() {
			curr++
			if (curr >= args.length) {
				curr = 0
			}
			return args[curr]
		}
	}

	static shuffle(arr) {
		const newArr = arr.slice()
		for (let i = newArr.length - 1; i > 0; i--) {
			const rand = Math.floor(Math.random() * (i + 1));
			[newArr[i], newArr[rand]] = [newArr[rand], newArr[i]];
		}

		return newArr
	};


	static isEven(number) {
		return (number % 2  === 0) ? true : false;
	}


	static isObject = function(a) {
		return (!!a) && (a.constructor === Object);
	};

	static print(values) {
		if (Array.isArray(values)) {
			values.forEach( (value, key) => {
				console.log(value.toString(), value);
			});
		} else {
			console.log(values.toString(), values);
		}
	}

	static mapRange(value, fromLow, fromHigh, toLow, toHigh) {
		return toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));
	}

	// # Kind of similar as above but with a better syntax and a limiting option
	static modulate(value, rangeA, rangeB, limit=true) {

		const [fromLow, fromHigh] = rangeA
		const [toLow, toHigh] = rangeB

		// # if rangeB consists of Colors we return a color tween
		// # if Color.isColor(toLow) or _.isString(toLow) and Color.isColorString(toLow)
		// # 	ratio = Utils.modulate(value, rangeA, [0, 1])
		// # 	result = Color.mix(toLow, toHigh, ratio)
		// # 	return result

		let result = toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow))

		if (limit) {
			if (toLow < toHigh) {
				if (result < toLow) { return toLow; }
				if (result > toHigh) { return toHigh; }
			} else {
				if (result > toLow) { return toLow; }
				if (result < toHigh) { return toHigh; }
			}
		}

		return result
	}

	static pointDistance(pointA, pointB) {
		const a = pointA.x - pointB.x;
		const b = pointA.y - pointB.y;
		return Math.sqrt((a * a) + (b * b));
	}

	static midPoint(pointA, pointB) {
		let midPoint = {};
		midPoint.x = (pointA.x + pointB.x) / 2;
		midPoint.y = (pointA.y + pointB.y) / 2;
		return midPoint;
	}

	static getMidPoint(data) {
		let minPoint = {};
		let maxPoint = {};

		minPoint.x = this.getMinX(data);
		maxPoint.x = this.getMaxX(data);

		minPoint.y = this.getMinY(data);
		maxPoint.y = this.getMaxY(data);

		return this.midPoint(minPoint, maxPoint);
	}

	// static getMinXPoint(data) {
	// 	let maxPoint = {};

	// 	maxPoint.x = this.getMinX(data);
	// 	maxPoint.y = this.getMinY(data);

	// 	return maxPoint;
	// }

	// static getMaxXPoint(data) {
	// 	let minPoint = {};

	// 	minPoint.x = this.getMaxX(data);
	// 	minPoint.y = this.getMaxY(data);

	// 	return minPoint;
	// }

	static getMinX(data) {
		return data.reduce((min, b) => Math.min(min, b.x), data[0].x);
	}

	static getMaxX(data) {
		return data.reduce((max, b) => Math.max(max, b.x), data[0].x);
	}

	static getMinY(data) {
		return data.reduce((min, b) => Math.min(min, b.y), data[0].y);
	}

	static getMaxY(data) {
		return data.reduce((max, b) => Math.max(max, b.y), data[0].y);
	}

	static convertRgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
		const hex = x.toString(16)
		return hex.length === 1 ? '0' + hex : hex
	}).join('');

	static hexToRgb = hex => {
		return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,(m, r, g, b) => '#' + r + r + g + g + b + b)
			.substring(1).match(/.{2}/g)
			.map(x => parseInt(x, 16))
	}

	static toArrayBuffer = (buf) => {
		const arrayBuffer = new ArrayBuffer(buf.length);
		const view = new Uint8Array(arrayBuffer);

		for (let i = 0; i < buf.length; ++i) {
			view[i] = buf[i];
		}

		return arrayBuffer;
	}

	static numToArray = (number) => {
		return Array.from(Array(number).keys())
	}

	static removePunctuation(string) {
		return string.replace(/(^\w+:|^)\/\/?(?:www\.)?/i, '').replace(/[^\w\s]/g, "_").replace(/\s+/g, "_").toLowerCase();
	}

	static isIframe () {
		try {
			return window.self !== window.top;
		} catch (e) {
			return true;
		}
	}

	static async b64toBlob (base64, type='image/jpeg') {
		const blob = await fetch(`${base64}`).then(res => res.blob())
		return blob
	}
}

export default Utils;