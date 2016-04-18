// HTML5 Canvas Basic Game Framework
// http://rembound.com/articles/how-to-make-a-html5-canvas-game
window.onload = function() {
	var NORTH = Math.PI * 3/2;
	
	var gameName = "LD35 ShapeShift";
	var titleHeight = 65;
	var fpsInterval = 0.5;  // how often to update the FPS display
	var numOthers = 5;  // TODO: set by level
	
	var canvas = document.getElementById("viewport"); 
	var context = canvas.getContext("2d");
	var bufferCanvas;
	var buffer;
	var bufferImageData;
	var bufferDirty = true;
	var lastframe = 0;
	var fpstime = 0;
	var framecount = 0;
	var fps = 0;
	var mousePos = {x:0, y:0};
	var player;
	var others = [];
	var selected = -1;
	
	var isPlaying = false;
	var score = 0;
	var mistakes = 0;
	
	function main(tframe) {
		window.requestAnimationFrame(main);
		render(update(tframe));
	}
	function update(tframe) {
		if (fpstime > fpsInterval) {
			fps = Math.round(framecount / fpstime);
			fpstime = 0;
			framecount = 0;
		}
		var dt = tframe - lastframe;
		lastframe = tframe;
		fpstime += dt / 1000;
		framecount++;
		return dt;
	}
	
	function init() {
		bufferCanvas = document.createElement('canvas');
		bufferCanvas.width = canvas.width;
		bufferCanvas.height = canvas.height - titleHeight;
		buffer = bufferCanvas.getContext("2d");
		bufferImageData = buffer.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
		
		for (var iy = 0; iy < bufferCanvas.height; iy++) {
			for (var ix = 0; ix < bufferCanvas.width; ix++) {
				var c = patternGradient(ix, iy);
				setPixel(bufferImageData, ix, iy, c.r, c.g, c.b, 255);
			}
		}
		buffer.putImageData(bufferImageData, 0, 0);
		
		for (var id=0; id < numOthers; id++)
			others[id] = new Other(bufferCanvas, buffer);
		
		player = new Player({x: canvas.width/2, y: canvas.height/2});
		
		canvas.addEventListener("mousemove", onMouseMove);
		canvas.addEventListener("mousedown", onMouseDown);
		canvas.addEventListener("mouseup", onMouseUp);
		canvas.addEventListener("mouseout", onMouseOut);
		startGame();
		
		main(0);
	}
	function patternGrid(x, y) {
		var c = 255;
		if ((x % 16) && (y % 16)) c = 63;
		else if ((x % 8) || (y % 8)) c = 127;
		return { r: c, g: c, b: c };
	}
	function patternGradient(x, y) {
		var r = (x % 256);
		var g = (y % 256);
		var b = ((x + y) % 4) * 64;
		return { r: r, g: g, b: b };
	}
 
	function render(dt) {
		// render title
		context.fillStyle = "#333333";
		context.fillRect(0, 0, canvas.width, titleHeight);
		context.fillStyle = "white";
		context.font = "24px Verdana";
		context.fillText(gameName, 10, 30);
		
		if (!isPlaying) {  // start menu
			context.fillRect(0, titleHeight, canvas.width, canvas.height-titleHeight);
			context.fillStyle = "black";
			context.fillText("Click to Play", canvas.width/2, canvas.height/2);
			// TODO: menu
			
		} else {  // gameplay
			for (var i=0; i<others.length; i++)
				others[i].update(dt, buffer, player);
			
			if (bufferDirty) {
				bufferImageData = buffer.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
				bufferDirty = false;
			}
			context.putImageData(bufferImageData, 0, titleHeight);
			
			if (selected >= 0) {
				var s = others[selected];
				context.lineWidth = 1;
				context.strokeStyle = "black";
				context.strokeRect(s.w(), s.n()+titleHeight, s.size, s.size);
			}
			
			player.render(context);
			context.fillText("Score: " + score, 500, 30);
		}
		
		// fps and mouse text
		context.font = "12px Verdana";
		context.fillText("FPS: " + fps + " SPF: " + Math.round(dt*1000)/1000, 13, 50);
		context.fillText("Mouse: " + mousePos.x + ", " + mousePos.y, 203, 50);
		
		// mouse cursor
		context.fillStyle = "red";
		context.fillRect(mousePos.x, mousePos.y, 4, 4);
	}
	
	function Other(canvas, context) {
		this.size = 32;
		this.x = Math.floor(Math.random() * canvas.width);
		this.y = Math.floor(Math.random() * canvas.height);
		this.updateCanvas = function(canvas) {
			this.nMin = this.size/2;
			this.wMin = this.size/2;
			this.eMax = canvas.width  - this.size/2;
			this.sMax = canvas.height - this.size/2;
		};
		this.updateCanvas(canvas);
		this.stayInside = function(canvas) {
			this.x = Math.min(Math.max(this.wMin, this.x), this.eMax);
			this.y = Math.min(Math.max(this.nMin, this.y), this.sMax);
		};
		this.stayInside(canvas);
		this.w = function() { return Math.floor(this.x - this.size/2); };
		this.e = function() { return Math.floor(this.x + this.size/2); };
		this.n = function() { return Math.floor(this.y - this.size/2); };
		this.s = function() { return Math.floor(this.y + this.size/2); };
		this.collides = function(point) {
			return (this.w() < point.x) && (point.x < this.e())
				&& (this.n() < point.y) && (point.y < this.s());
		};
		
		this.shiftContext = function(context) { context.putImageData(this.imageData, this.w(), this.n()); };
		this.shiftSelf = function(context) { this.imageData = context.getImageData(this.x, this.y, this.size, this.size); };
		this.shiftSelf(context);
		
		this.minMoveDelay =  5000;
		this.maxMoveDelay = 15000;
		this.nextMove = -1;
		this.shouldMove = function(dt) {
			if (this.nextMove > 0) {
				this.nextMove -= dt;
				return false;
			}
			this.nextMove = Math.round(Math.random() * this.maxMoveDelay - this.minMoveDelay) + this.minMoveDelay;
			return true;
		};
		var moveRandomDir = function() {
			var direction = Math.random() * Math.PI * 2;
			this.x += Math.cos(direction) * this.size;
			this.y += Math.sin(direction) * this.size;
		};
		var moveOnePixel = function() {
			var directions = [{x:1,y:1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1}];
			var direction = directions[Math.random()*4|0];
			this.x += direction.x;
			this.y += direction.y;
		};
		this.move = moveRandomDir;
		
		var updateLive = function(dt, context, player) {
			// http://stackoverflow.com/questions/1878907/the-smallest-difference-between-2-angles
			var diff = player.dir - (NORTH - angleBetween(player.x, player.y, this.x, this.y));
			var diffAngle = Math.atan2(Math.sin(diff), Math.cos(diff));
			if (Math.abs(diffAngle) < player.fov/2)  // if they can see me
				this.shiftSelf(context);  // shapeshift self to background
			else if (this.shouldMove(dt)) {
				this.shiftContext(context);  // shapeshift background to self
				bufferDirty = true;
				this.move();
			}
		};
		var updateDie = function(dt, context, player) {
			var chalkOutline = context.getImageData(this.x, this.y, this.size, this.size);
			for (var iy = 0; iy < chalkOutline.height; iy++) {
				for (var ix = 0; ix < chalkOutline.width; ix++) {
					var c = getPixel(chalkOutline, ix, iy);
					setPixel(chalkOutline, ix, iy, 255-c.r, 255-c.g, 255-c.b, 255);
				}
			}
			context.putImageData(chalkOutline, this.w(), this.n());
			bufferDirty = true;
			this.update = updateDead;
		};
		var updateDead = function(dt, context, player) {
			; // TODO: ghost floats away
		};
		this.update = updateLive;
		this.alive = function() { return this.update == updateLive; };
		this.onClick = function() { this.update = updateDie; };
	}
	
	function Player(point) {
		this.size = 16;
		this.viewDistance = 64;
		this.fov = Math.PI/3;
	
		this.x = point.x;
		this.y = point.y;
		this.dir = NORTH;
		this.lookAt = function(point) { 
			this.dir = NORTH - angleBetween(this.x, this.y, point.x, point.y);
		};
		
		this.render = function(context) {
			var fovMin = this.dir - this.fov/2;
			var fovMax = this.dir + this.fov/2;
			
			// fov boundary lines, 1px light gray
			context.lineWidth = 1;
			context.strokeStyle = "#dddddd";
			context.beginPath();
			context.moveTo(this.x, this.y);
			context.lineTo(
				this.x + Math.cos(fovMax) * this.viewDistance, 
				this.y + Math.sin(fovMax) * this.viewDistance);
			context.moveTo(this.x, this.y);
			context.lineTo(
				this.x + Math.cos(fovMin) * this.viewDistance, 
				this.y + Math.sin(fovMin) * this.viewDistance);
			context.stroke();
			
			// fov arc, 3px red
			context.lineWidth = 3;
			context.strokeStyle = "red";
			context.beginPath();
			context.arc(this.x, this.y, this.size, fovMin, fovMax);
			context.stroke();
			
			// player circle, lightest gray with 2px black outline
			context.lineWidth = 2;
			context.fillStyle = "#eeeeee";
			context.strokeStyle = "black";
			context.beginPath();
			context.arc(this.x, this.y, this.size/2, 0, Math.PI*2);
			context.fill();
			context.stroke();
		};
	}
	
	// http://beej.us/blog/data/html5s-canvas-2-pixel/
	function setPixel(imageData, x, y, r, g, b, a) {
		index = (x + y * imageData.width) * 4;
		imageData.data[index+0] = r;
		imageData.data[index+1] = g;
		imageData.data[index+2] = b;
		imageData.data[index+3] = a;
	}
	function getPixel(imageData, x, y) {
		index = (x + y * imageData.width) * 4;
		return { 
			r: imageData.data[index+0],
			g: imageData.data[index+1],
			b: imageData.data[index+2],
			a: imageData.data[index+3]
		}
	}

	function angleBetween(x1, y1, x2, y2) { return Math.atan2(x1-x2, y1-y2); }
	
	function bufferOffset(point) { return { x: point.x, y: point.y - titleHeight }; }
	
	var updateMouse = function (e) {
		var r = canvas.getBoundingClientRect();
		mousePos = {
			x: Math.round((e.clientX - r.left)/(r.right  - r.left)*canvas.width ),
			y: Math.round((e.clientY - r.top )/(r.bottom - r.top )*canvas.height)
		}
		player.lookAt(mousePos);  // TODO: smooth
	};
	
	var clickStart = function (e) {
		selected = -1;
		for (var i = 0; i < others.length; i++) {
			if (others[i].collides(bufferOffset(mousePos))) {
				selected = i;
				return;
			}
		}
		console.log("tick...tick...tick...");
	};
	var clickFinish = function (e) {
		if (selected < 0) {
			console.log("boom!");
			score--;
			mistakes++;
		} else {
			if (!others[selected].alive()) {
				console.log("clicked #" + selected + " again");
				selected = -1;
				return;
			}
			
			console.log("clicked #" + selected);
			score++;
			others[selected].onClick();
			selected = -1;
			
			for (var i=0; i<others.length; i++)
				if (others[i].alive()) 
					return;		
			// if we're here, they're all dead
			console.log("level complete!");
		}
	};
	
	var doNothing = function () { ; };
	
	var startGame = function () { 
		isPlaying = false;
		handleMouse("start");
	};
	var playGame = function () { 
		isPlaying = true;
		handleMouse("play");
	};
	var pauseGame = function () {
		isPlaying = false;
		handleMouse("pause");
	};
	
	function handleMouse(state) {
		if (state == "start") {
			_onMouseMove = doNothing;
			_onMouseDown = doNothing;
			_onMouseUp = playGame;
			_onMouseOut = doNothing;
		} else {  // state == "play"
			_onMouseMove = updateMouse;
			_onMouseDown = clickStart;
			_onMouseUp = clickFinish;
			_onMouseOut = clickFinish;
		}
		// TODO: pause
	}
	
	function onMouseMove(e) { _onMouseMove(e); }
	function onMouseDown(e) { _onMouseDown(e); }
	function onMouseUp(e)   { _onMouseUp(e); }
	function onMouseOut(e)  { _onMouseOut(e); }
	
	init();
};