// HTML5 Canvas Basic Game Framework
// http://rembound.com/articles/how-to-make-a-html5-canvas-game
window.onload = function() {
    var canvas = document.getElementById("viewport"); 
    var context = canvas.getContext("2d");
 
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;
	var mousePos = {x:0, y:0};
	var playerLook = 0;
	
	var titleHeight = 65;
	var bgImageData;
	
	var playerSize = 16;
	var viewDistance = 4;
	var playerFOV = Math.PI/3;
	var playerX = (canvas.width - playerSize)/2;
	var playerY = (canvas.height - playerSize + titleHeight)/2;
	
	var others = [];
 
    function init() {
		spawn();
		
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseout", onMouseOut);
		
        main(0);
    }
 
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
	
	function spawn() {
		// background pattern
		bgImageData = context.createImageData(canvas.width, canvas.height - titleHeight);
		for (var iy = 0; iy < canvas.height - titleHeight; iy++) {
			for (var ix = 0; ix < canvas.width; ix++) {
				var i = (ix + iy * bgImageData.width) * 4;
				bgImageData.data[i+0] = (ix - iy) % 256;  // r
				bgImageData.data[i+1] = (ix + iy) % 256;  // g
				bgImageData.data[i+2] = 255;  // b
				bgImageData.data[i+3] = 255;  // a
			}
		}
		context.putImageData(bgImageData, 0, titleHeight);
		
		// others
		var size = 8;
		for (var id=0; id < 23; id++) {
			others[id] = { 
				x: Math.floor( Math.random() *  (canvas.width  - size              ) + size                ),
				y: Math.floor( Math.random() * ((canvas.height - size - titleHeight) + size + titleHeight) ),
				size: size, 
				imageData: null,
				minMoveDelay:  1,  // frames
				maxMoveDelay: 10,
				nextMove: 0
			};
			move(others[id]);
			shapeshift(others[id]);
		}
	}
 
    function render() {
        // background
		context.putImageData(bgImageData, 0, titleHeight);
 
		// title
        context.fillStyle = "#333333";
        context.fillRect(0, 0, canvas.width, titleHeight);
 
        context.fillStyle = "white";
        context.font = "24px Verdana";
        context.fillText("LD35 ShapeShift", 10, 30);
 
        context.font = "12px Verdana";
        context.fillText("Fps: " + fps, 13, 50);
        context.fillText("Mouse: " + mousePos.x + ", " + mousePos.y, 103, 50);
		
		// others
		others.forEach(function (other) {
			if (isInView(other.x, other.y)) {
				shapeshift(other);
				drawOther(other, "green");
			} else {
				move(other);
				drawOther(other, "red");
			}
		});
		
		// player
		drawPlayer();
    }
		
	function isInView(x, y) {
		var viewDir = Math.PI*3/2 - angleBetween(playerX, playerY, x, y);
		
		http://stackoverflow.com/questions/1878907/the-smallest-difference-between-2-angles
		var diff = playerLook - viewDir;
		var diffAngle = Math.atan2(Math.sin(diff), Math.cos(diff));
		
		return (Math.abs(diffAngle) < playerFOV/2);
	}
	
	function drawOther(other, color) {
		var s2 = Math.floor(other.size / 2);
		context.putImageData(other.imageData, other.x - s2, other.y - s2);
	}
	
	function drawPlayer() {
		context.lineWidth = 1;
		context.strokeStyle = "#dddddd";
		context.beginPath();
		context.moveTo(playerX, playerY);
		context.lineTo(
			playerX + Math.cos(playerLook + playerFOV/2)*playerSize * viewDistance, 
			playerY + Math.sin(playerLook + playerFOV/2)*playerSize * viewDistance);
		context.moveTo(playerX, playerY);
		context.lineTo(
			playerX + Math.cos(playerLook - playerFOV/2)*playerSize * viewDistance, 
			playerY + Math.sin(playerLook - playerFOV/2)*playerSize * viewDistance);
		context.stroke();
		
		context.lineWidth = 3;
		context.strokeStyle = "red";
		context.beginPath();
		context.arc(playerX, playerY, playerSize, 
			playerLook - playerFOV/2, 
			playerLook + playerFOV/2);
		context.stroke();
		
		context.lineWidth = 2;
		context.fillStyle = "#eeeeee";
		context.strokeStyle = "black";
		context.beginPath();
		context.arc(playerX, playerY, playerSize/2, 0, Math.PI*2);
		context.fill();
		context.stroke();
		
		context.fillStyle = "#999999";
		context.fillRect(mousePos.x, mousePos.y, 2, 2);
	}
	

    function onMouseMove(e) {
		var rect = canvas.getBoundingClientRect();
        mousePos.x = Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width);
		mousePos.y = Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height);
		playerLook = Math.PI*3/2 - angleBetween(playerX, playerY, mousePos.x, mousePos.y);
	}
    function onMouseDown(e) {}
    function onMouseUp(e) {}
    function onMouseOut(e) {}

	function angleBetween(x1, y1, x2, y2) { return Math.atan2(x1-x2, y1-y2); }
	
	function shapeshift(other) {
		var s2 = Math.floor(other.size / 2);
		other.imageData = context.getImageData(other.x - s2, other.y - s2, other.size, other.size);
	}
	
	function move(other) {
		if (other.nextMove > 0) {
			other.nextMove--;
			return;
		}
		other.nextMove = Math.round(Math.random() * other.maxMoveDelay - other.minMoveDelay) + other.minMoveDelay;
		
		// TODO: speed, persistent direction
		var direction = Math.random() * Math.PI * 2;
		other.x += Math.cos(direction);
		other.y += Math.sin(direction);
		
		// stay within the drawing area
		other.x = Math.min(Math.max(              other.size, other.x), canvas.width  - other.size);
		other.y = Math.min(Math.max(titleHeight + other.size, other.y), canvas.height - other.size);
	}
	
    init();
};