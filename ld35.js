// HTML5 Canvas Basic Game Framework
// http://rembound.com/articles/how-to-make-a-html5-canvas-game
window.onload = function() {
	var titleHeight = 65;
	var numOthers = 5;
	var otherSize = 32;
	var playerSize = 16;
	var viewDistance = 4;
	var fov = Math.PI/3;
	
    var canvas = document.getElementById("viewport"); 
    var context = canvas.getContext("2d");
	var bufferCanvas;
	var buffer;
	var bufferImageData;
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;
	var mousePos = {x:0, y:0};
	var lookAt = 0;
	var playerX;
	var playerY;
	var others = [];
	
    function main(tframe) {
        window.requestAnimationFrame(main);
        update(tframe);
        render();
    }
    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;
        updateFps(dt);
    }
    function updateFps(dt) {
        if (fpstime > 0.25) {
            fps = Math.round(framecount / fpstime);
            fpstime = 0;
            framecount = 0;
        }
 
        fpstime += dt;
        framecount++;
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
	
    function init() {
		bufferCanvas = document.createElement('canvas');
		bufferCanvas.width = canvas.width;
		bufferCanvas.height = canvas.height - titleHeight;
		buffer = bufferCanvas.getContext("2d");
		bufferImageData = buffer.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
		
		playerX = (bufferCanvas.width - playerSize)/2;
		playerY = (bufferCanvas.height - playerSize)/2;
		
		// background pattern
		for (var iy = 0; iy < bufferCanvas.height; iy++) {
			for (var ix = 0; ix < bufferCanvas.width; ix++) {
				var c = patternGradient(ix, iy);
				setPixel(bufferImageData, ix, iy, c.r, c.g, c.b, 255);
			}
		}
		buffer.putImageData(bufferImageData, 0, 0);
		
		// others
		for (var id=0; id < numOthers; id++) {
			others[id] = { 
				x: Math.floor(Math.random() * canvas.width),
				y: Math.floor(Math.random() * canvas.height),
				size: otherSize, 
				imageData: null,
				minMoveDelay:  60,  // frames
				maxMoveDelay: 180,
				nextMove: 0
			};
			corral(others[id]);
			shapeshift(others[id]);
		}
		
        canvas.addEventListener("mousemove", onMouseMove);
        //canvas.addEventListener("mousedown", onMouseDown);
        //canvas.addEventListener("mouseup", onMouseUp);
        //canvas.addEventListener("mouseout", onMouseOut);
		
        main(0);
    }
 
    function render() {
		// update others in buffer
		others.forEach(function (other) {
			var x = other.x - other.size/2;
			var y = other.y - other.size/2;
			
			// http://stackoverflow.com/questions/1878907/the-smallest-difference-between-2-angles
			var diff = lookAt - (Math.PI*3/2 - angleBetween(playerX, playerY, other.x, other.y));
			var diffAngle = Math.atan2(Math.sin(diff), Math.cos(diff));
			
			if (Math.abs(diffAngle) < fov/2)
				shapeshift(other);
			else 
				move(other);
		});
		
		// background and buffer
		bufferImageData = buffer.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
		context.putImageData(bufferImageData, 0, titleHeight);
		
		// player
		context.lineWidth = 1;
		context.strokeStyle = "#dddddd";
		context.beginPath();
		context.moveTo(playerX, playerY + titleHeight);
		context.lineTo(
			playerX + Math.cos(lookAt + fov/2)*playerSize * viewDistance, 
			playerY + Math.sin(lookAt + fov/2)*playerSize * viewDistance + titleHeight);
		context.moveTo(playerX, playerY + titleHeight);
		context.lineTo(
			playerX + Math.cos(lookAt - fov/2)*playerSize * viewDistance, 
			playerY + Math.sin(lookAt - fov/2)*playerSize * viewDistance + titleHeight);
		context.stroke();
		
		context.lineWidth = 3;
		context.strokeStyle = "red";
		context.beginPath();
		context.arc(playerX, playerY + titleHeight, playerSize, lookAt - fov/2, lookAt + fov/2);
		context.stroke();
		
		context.lineWidth = 2;
		context.fillStyle = "#eeeeee";
		context.strokeStyle = "black";
		context.beginPath();
		context.arc(playerX, playerY + titleHeight, playerSize/2, 0, Math.PI*2);
		context.fill();
		context.stroke();
		
		// title
        context.fillStyle = "#333333";
        context.fillRect(0, 0, canvas.width, titleHeight);
 
        context.fillStyle = "white";
        context.font = "24px Verdana";
        context.fillText("LD35 ShapeShift", 10, 30);
 
        context.font = "12px Verdana";
        context.fillText("Fps: " + fps, 13, 50);
        context.fillText("Mouse: " + mousePos.x + ", " + mousePos.y, 103, 50);
		
		// mouse cursor
		context.fillStyle = "red";
		context.fillRect(mousePos.x, mousePos.y, 4, 4);
	}
	
	function shapeshift(other) {
		var x = other.x - other.size/2;
		var y = other.y - other.size/2;
		other.imageData = buffer.getImageData(x, y, other.size, other.size);
	}
	
	function move(other) {
		if (other.nextMove > 0) {
			other.nextMove--;
			return;
		}
		other.nextMove = Math.round(Math.random() * other.maxMoveDelay - other.minMoveDelay) + other.minMoveDelay;
		
		// ghost trail at old location
		var x = other.x - other.size/2;
		var y = other.y - other.size/2;
		buffer.putImageData(other.imageData, x, y);
		
		// TODO: speed, persistent direction
		var direction = Math.random() * Math.PI * 2;
		var speed = other.size;
		other.x += Math.cos(direction) * speed;
		other.y += Math.sin(direction) * speed;
		
		corral(other);
	}
	
	function corral(other) {
		// stay within the drawing area
		other.x = Math.min(Math.max(other.size, other.x), bufferCanvas.width  - other.size);
		other.y = Math.min(Math.max(other.size, other.y), bufferCanvas.height - other.size);
	}
	
	// http://beej.us/blog/data/html5s-canvas-2-pixel/
	function setPixel(imageData, x, y, r, g, b, a) {
		index = (x + y * imageData.width) * 4;
		imageData.data[index+0] = r;
		imageData.data[index+1] = g;
		imageData.data[index+2] = b;
		imageData.data[index+3] = a;
	}
	
	/*function getPixel(imageData, x, y) {
		index = (x + y * imageData.width) * 4;
		return { 
			r: imageData.data[index+0],
			g: imageData.data[index+1],
			b: imageData.data[index+2],
			a: imageData.data[index+3]
		}
	}*/

	function angleBetween(x1, y1, x2, y2) { return Math.atan2(x1-x2, y1-y2); }
	
    function onMouseMove(e) {
		var rect = canvas.getBoundingClientRect();
        mousePos.x = Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width);
		mousePos.y = Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height);
		lookAt = Math.PI*3/2 - angleBetween(playerX, playerY, mousePos.x, mousePos.y);
	}
    //function onMouseDown(e) {}
    //function onMouseUp(e) {}
    //function onMouseOut(e) {}
	
    init();
};