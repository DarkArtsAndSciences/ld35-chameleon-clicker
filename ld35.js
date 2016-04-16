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
		for (var i=0; i<11; i++) {
			others[i] = {
				x:  Math.random() * canvas.width, 
				y: (Math.random() * canvas.height - titleHeight) + titleHeight
			}
		}
	}
 
    function render() {
        drawFrame();
		drawOthers();
		drawPlayer();
    }
	
	function drawOthers() {
		others.forEach(function(other) {
			if (isInView(other.x, other.y)) {
				drawOther("green", 2, other.x, other.y);
			} else {
				other.x += Math.round(Math.random() * 4) - 2;
				other.y += Math.round(Math.random() * 4) - 2;
				drawOther("red", 2, other.x, other.y);
			}
		});
	}
	
	function isInView(x, y) {
		var viewDir = Math.PI*3/2 - getDir(playerX, playerY, x, y + titleHeight);
		var diff = playerLook - viewDir;
		var diffAngle = Math.atan2(Math.sin(diff), Math.cos(diff));
		return (Math.abs(diffAngle) < playerFOV/2);
	}
	
	function drawOther(color, size, x, y) {
		context.fillStyle = color;
		context.fillRect(x, y + titleHeight, size, size);
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
	
    function drawFrame() {
        context.fillStyle = "#dddddd";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#eeeeee";
        context.fillRect(1, 1, canvas.width-2, canvas.height-2);
 
        context.fillStyle = "#333333";
        context.fillRect(0, 0, canvas.width, titleHeight);
 
        context.fillStyle = "white";
        context.font = "24px Verdana";
        context.fillText("LD35 ShapeShift", 10, 30);
 
        context.font = "12px Verdana";
        context.fillText("Fps: " + fps, 13, 50);
        context.fillText("Mouse: " + mousePos.x + ", " + mousePos.y, 103, 50);
    }
 
    function onMouseMove(e) {
        mousePos = getMousePos(canvas, e);
		playerLook = Math.PI*3/2 - getDir(playerX, playerY, mousePos.x, mousePos.y);
	}
    function onMouseDown(e) {}
    function onMouseUp(e) {}
    function onMouseOut(e) {}
 
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height)
        };
    }

	function getDir(x1, y1, x2, y2) { 
		return Math.atan2(x1 - x2, y1 - y2);
	}
 
    init();
};