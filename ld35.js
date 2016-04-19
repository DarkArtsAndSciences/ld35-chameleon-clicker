window.onload = function() {
	var NORTH = Math.PI * 3/2;
	var DEBUG = true;
	
	var gameName = "LD35 ShapeShift";
	var titleHeight = 100;
	var fpsInterval = 0.5;  // how often to update the FPS display
	
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
	var isPlaying = false;
	
	function AudioHandler() {
		function loadSound (name) {
			return new Howl({
				urls: ['sfx/'+name+'.wav'],
				autoplay: false,
				buffer: true,
				loop: false
			});
		}
		this.sounds = {
			score: loadSound("score"),
			mistake: loadSound("mistake"),
			overkill: loadSound("fade"),
			complete: loadSound("flip_down"),
			shiftSelf: loadSound("flip_up"),
			warning: loadSound("minibass")
		};
	}
	var audioHandler;
	
	function LevelHandler(bufferCanvas, buffer) {
		var bufferCanvas = bufferCanvas;
		var buffer = buffer;
		
		var numOthers = 3;  // * level
		var others = [];
		var selected = -1;
		this.isSelected = function() { return selected > -1; };
		this.selectedIsAlive = function() { return others[selected].alive(); };
		this.anyoneIsAlive = function() {
			for (var i=0; i<others.length; i++)
				if (others[i].alive()) 
					return true;
			return false;
		}
		this.updateOthers = function(dt, players) {
			for (var i=0; i<others.length; i++)
				others[i].update(dt, buffer, player);
		}
		this.highlightSelected = function() {
			if (selected >= 0) {
				var s = others[selected];
				context.lineWidth = 1;
				context.strokeStyle = "black";
				context.strokeRect(s.w(), s.n()+titleHeight, s.size, s.size);
			}
		}
		this.selectCollidee = function(mousePos) {
			selected = -1;
			for (var i = 0; i < others.length; i++) {
				if (others[i].collides(bufferOffset(mousePos))) {
					selected = i;
					return true;
				}
			}
			return false;
		}
		this.deselect = function() { selected = -1; };
		
		var image = document.getElementById("test");
		var bgImage = function() {
			buffer.drawImage(image, 0, 0);
		};
		var bgPattern = function(bgPatternPixel) {
			return function() {
				for (var iy = 0; iy < bufferCanvas.height; iy++) {
					for (var ix = 0; ix < bufferCanvas.width; ix++) {
						var c = bgPatternPixel(ix, iy);
						setPixel(bufferImageData, ix, iy, c.r, c.g, c.b, 255);
					}
				}
				buffer.putImageData(bufferImageData, 0, 0);
			}
		};
		var bgPatternGrid = function (x, y) {
			var c = 255;
			if ((x % 16) && (y % 16)) c = 63;
			else if ((x % 8) || (y % 8)) c = 127;
			return { r: c, g: c, b: c };
		};
		var bgPatternGradient = function (x, y) {
			var r = (x % 256);
			var g = (y % 256);
			var b = ((x + y) % 4) * 64;
			return { r: r, g: g, b: b };
		}
		var bgColor = [
			bgImage,
			bgPattern(bgPatternGradient),
			bgPattern(bgPatternGrid)
		];
		
		var score = -1;
		var lastScore = -1;
		var highScore = -1;
		this.addScore = function() { 
			score += 1;  // TODO: numOthers * level - aliveOthers 
			others[selected].onClick();
			selected = -1;
		}
		this.getScore = function() { return score; }
		this.getLastScore = function() { return lastScore; }
		this.getHighScore = function() { return highScore; }
		
		var mistakes = -1;
		var lastMistakes = -1;
		var highMistakes = -1;
		this.makeMistake = function() {
			mistakes--; 
			if (mistakes < 0) {  // game over
				lastScore = score;
				lastMistakes = mistakes;
				highScore = Math.max(score, highScore);
				gameOver();
			}
		}
		this.getMistakes = function() { return mistakes; }
		this.getLastMistakes = function() { return lastMistakes; }
		this.getHighMistakes = function() { return highMistakes; }
		this.getMistakeColor = function() {
			return mistakes > 2 ? mistakes > 6 ? "green" : "yellow" : "red";
		}
		
		var level;
		var mistakesPerLevel = 20;
		this.getLevel = function () { return level; };
		this.nextLevel = function() {
			level++;
			mistakes += Math.max(1, 1 + mistakesPerLevel - level);
			highMistakes = Math.max(mistakes, highMistakes);
			
			bgColor[level % bgColor.length]();
			
			for (var id=0; id < numOthers * level; id++)
				others[id] = new Other(bufferCanvas, buffer, 1000 * level, 2000 * level * level);
		}; 
		this.start = function() { 
			level = 0; 
			score = 0; 
			mistakes = 0;
			this.nextLevel(); 
		};
		this.start();
	}
	var levelHandler;
	
	// HTML5 Canvas Basic Game Framework
	// http://rembound.com/articles/how-to-make-a-html5-canvas-game
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
		audioHandler = new AudioHandler();
		
		bufferCanvas = document.createElement('canvas');
		bufferCanvas.width = canvas.width;
		bufferCanvas.height = canvas.height - titleHeight;
		buffer = bufferCanvas.getContext("2d");
		bufferImageData = buffer.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
		
		levelHandler = new LevelHandler(bufferCanvas, buffer);
		
		player = new Player({x: canvas.width/2, y: canvas.height/2});
		
		canvas.addEventListener("mousemove", onMouseMove);
		canvas.addEventListener("mousedown", onMouseDown);
		canvas.addEventListener("mouseup", onMouseUp);
		canvas.addEventListener("mouseout", onMouseOut);
		startGame();
		
		main(0);
	}
	
	function renderCenteredText(context, text, left, top, width, height) {
		var measure = context.measureText(text);
		context.fillText(text, 
			Math.floor(left + width/2 - measure.width/2),
			Math.floor(top + height/2));
	}
 
	function render(dt) {
		// render title
		context.fillStyle = "#333333";
		context.fillRect(0, 0, canvas.width, titleHeight);
		context.fillStyle = "white";
		context.font = "24px Verdana";
		renderCenteredText(context, gameName, 0, 30, canvas.width, 0);
		
		var highScore = levelHandler.getHighScore();
		var highMistakes = levelHandler.getHighMistakes();
		
		if (!isPlaying) {  // start menu
			context.fillRect(0, titleHeight, canvas.width, canvas.height-titleHeight);
			// TODO: menu background
			
			context.fillStyle = "black";
			renderCenteredText(context, "Click Anywhere to Play", 
				0, 0, canvas.width, canvas.height * 0.75);
			context.font = "18px Verdana";
			var lines = [
				"Click all the shapes on each level.",
				"",
				"They will stop moving",
				"when you look at them",
				"but it won't be easier."]
			for (var i=0; i<lines.length; i++)
				renderCenteredText(context, lines[i], 
					0, Math.floor(i*24), canvas.width, canvas.height);
					
			context.fillStyle = "#cccccc";
			context.font = "16px Verdana";
			if (highScore > -1)
				renderCenteredText(context, "High Score: " + highScore, 
					canvas.width * 0.33, titleHeight-30, canvas.width * 0.33, 0);
			if (highMistakes > -1)
				renderCenteredText(context, "High Health: " + highMistakes, 
					canvas.width * 0.67, titleHeight-30, canvas.width * 0.33, 0);
			
		} else {  // gameplay
			levelHandler.updateOthers(dt, player);
			
			if (bufferDirty) {
				bufferImageData = buffer.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
				bufferDirty = false;
			}
			context.putImageData(bufferImageData, 0, titleHeight);
			
			levelHandler.highlightSelected(context);
			player.render(context);
			
			context.font = "16px Verdana";
			context.fillStyle = "white";
			renderCenteredText(context, "Level: " + levelHandler.getLevel(), 
				canvas.width * 0.00, titleHeight-10, canvas.width * 0.33, 0);
				
			var score = levelHandler.getScore();
			context.fillStyle = score > highScore ? "cyan": "white";
			renderCenteredText(context, "Score: " + score, 
				canvas.width * 0.33, titleHeight-10, canvas.width * 0.33, 0);
				
			context.fillStyle = levelHandler.getMistakeColor();
			renderCenteredText(context, "Health: " + levelHandler.getMistakes(), 
				canvas.width * 0.67, titleHeight-10, canvas.width * 0.33, 0);
				
			context.fillStyle = "#cccccc";
			if (highScore > -1)
				renderCenteredText(context, "High Score: " + highScore, 
					canvas.width * 0.33, titleHeight-30, canvas.width * 0.33, 0);
					
			if (highMistakes > -1)
				renderCenteredText(context, "High Health: " + highMistakes, 
					canvas.width * 0.67, titleHeight-30, canvas.width * 0.33, 0);
		}
		
		// fps and mouse text
		if (DEBUG) {
			context.fillStyle = "white";
			context.font = "12px Verdana";
			context.fillText("FPS: " + fps, 5, 18);
			//context.fillText("Mouse: " + mousePos.x + ", " + mousePos.y, 5, titleHeight-10);
		}
		
		// mouse cursor
		context.fillStyle = "red";
		context.fillRect(mousePos.x, mousePos.y, 4, 4);
	}
	
	function Other(canvas, context, minMoveDelay, maxMoveDelay) {
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
		
		this.minMoveDelay = minMoveDelay;
		this.maxMoveDelay = maxMoveDelay;
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
			if (Math.abs(diffAngle) < player.fov/2) {  // if they can see me
				this.shiftSelf(context);  // shapeshift self to background
				//audioHandler.sounds.shiftSelf.play();
			} else if (this.shouldMove(dt)) {
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
		audioHandler.sounds.warning.play();
		levelHandler.selectCollidee(mousePos);
	};
	var clickFinish = function (e) {
		if (!levelHandler.isSelected()) {
			if (mouseIsDown) {
				console.log("You clicked empty space.");
				audioHandler.sounds.mistake.play();
				levelHandler.makeMistake();
			} // else it's a mouseUp mouseOut, ignore
		} else {
			if (!levelHandler.selectedIsAlive()) {
				console.log("It's already dead, quit clicking it.");
				audioHandler.sounds.overkill.play();
				levelHandler.deselect();
				return;
			}
			
			console.log("It dies; its colors invert.");
			audioHandler.sounds.score.play();
			levelHandler.addScore();
			
			if (!levelHandler.anyoneIsAlive()) {
				console.log("Level complete!  Have some more...");
				audioHandler.sounds.complete.play();
				levelHandler.nextLevel();
			}
		}
	};
	
	var doNothing = function () { ; };
	
	var startGame = function () { 
		isPlaying = false;
		levelHandler.start();
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
	var gameOver = function () {
		isPlaying = false;
		levelHandler.start();
		handleMouse("start");
	}
	
	function handleMouse(state) {
		if (state == "start") {
			_onMouseMove = updateMouse;
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
	
	var mouseIsDown = false;
	function onMouseMove(e) { _onMouseMove(e); }
	function onMouseDown(e) { _onMouseDown(e); mouseIsDown = true; }
	function onMouseUp(e)   { _onMouseUp(e); mouseIsDown = false; }
	function onMouseOut(e)  { _onMouseOut(e); }
	
	init();
};