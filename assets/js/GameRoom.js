$(document).ready(function () {
    init();

    //判断页面刷新与关闭代码
    var beforeUnloadTime = 0,
        gapTime = 0;
    var isFireFox = navigator.userAgent.indexOf("Firefox") > -1; //是否是火狐浏览器
    window.onunload = function () {
        gapTime = new Date().getTime() - beforeUnloadTime;
        if (gapTime <= 5) {
            $.ajax({
                type: "POST",
                url: "ExitGameRoom"
            });
        }
    };
    window.onbeforeunload = function () {
        ws.close();
        beforeUnloadTime = new Date().getTime();
        if (isFireFox) {
            $.ajax({
                type: "POST",
                url: "ExitGameRoom"
            });
        } //火狐关闭执行
    };
});

//页面初始化函数
function init() {
    //加载image以便后续使用
    blackChess = new Image();
    blackChess.src = "assets/images/game/black.png";
    whiteChess = new Image();
    whiteChess.src = "assets/images/game/white.png";

    //闪烁提示动画
    var changeFlag = 0;

    function flash() {
        if (!changeFlag) {
            $(".image-alert").show();
            changeFlag = 1;
        } else {
            $(".image-alert").hide();
            changeFlag = 0;
        }
    }

    setInterval(flash, 500);

    cssSetting();

    $("#progressbar").progressbar({
        value: 0,
        create: function (event, ui) {
            $(this).addClass('progress progress-striped active');
            $("#progressbar>div").addClass('progress-bar progress-bar-success');
        }
    });

    getGameRoomData();

    loadPlayerList();

    $("#player-list > tr:first").trigger("onclick");

    let userId = GameRoomData.whoGet;

    loadPlayerHolder();

    initGamePad();

    initChessPoint();

    loadChess();

    loadCoverDiv(userId);

    loadButtonGroup(userId);

    connectWebSocket();

    //游戏中点击棋点下棋的点击事件
    $("body").on("click", ".chess-point", function () {
        let chessType = GameRoomData.gameInfo.playerState[userId].chessType;
        let x = $(this).data("x");
        let y = $(this).data("y");
        //TODO(MICHAEL)发送下棋的http请求
        $.ajax({
            type: "post",
            url: "PutChess",
            data: {"chessType": chessType, "x": x, "y": y},
            success: function (data) {
                if (data.status == "00") {
                    getGameRoomData();
                    let userId = GameRoomData.whoGet;
                    initChessPoint();
                    loadChess();
                    loadCoverDiv(userId);
                    loadPlayerHolder();
                }
            }
        });
    });

    //准备按钮点击事件
    $("#ready-btn").click(function () {
        var userId = GameRoomData.whoGet;
        var playerInfo = GameRoomData.playerInfo;
        var readyState = 0;
        for (var i = 0; i < playerInfo.length; i++) {
            if (playerInfo[i].userId == userId) {
                readyState = playerInfo[i].readyState;
                break;
            }
        }
        if (readyState == 0) {
            $(".player-status[data-id=" + userId + "]>span").text("已准备");
            $("#ready-btn").text("取消准备");
        } else {
            $(".player-status[data-id=" + userId + "]>span").text("未准备");
            $("#ready-btn").text("准备");
        }

        $.ajax({
            type: "POST",
            url: "Ready",
            data: {"readyState": readyState}
        });
    });

    $("#btn-return").click(function () {
        ws.close();
        $.ajax({
            type: "POST",
            url: "ExitGameRoom",
            async: false,
            success: function () {
                window.close();
            }
        });
    });

    $(window).resize(function () {
        let userId = GameRoomData.whoGet;
        cssSetting();

        initChessPoint();

        loadCoverDiv(userId);
    });

    //发送消息事件
    $(document).keyup(function (e) {
        if (e.keyCode == 13) {
            var message = $("#message-input").val();
            if (isEmpty(message)) {
                return;
            }
            let userId = GameRoomData.whoGet;
            let username;
            let playerInfo = GameRoomData.playerInfo;
            for (let i = 0; i < playerInfo.length; i++) {
                if (playerInfo[i].userId == userId) {
                    username = playerInfo[i].username;
                    break;
                }
            }
            message = htmlEncode(message);
            sendMessage(message);
            insertMessage(username, message);
            $("#message-input").val("");
            $("#message-content").slimScroll({scrollBy: '300px'});
        }
    });

    //创建提醒
    layer.msg("请不要在对局开始后关闭页面或退出游戏房间，这样会导致你输掉对局！", {time: 2000});

    $("#give-up").click(function () {
        layer.confirm("确定要认输嘛？", function (index) {
            $.ajax({
                type: "POST",
                url: "GiveUp"
            });
            layer.close(index);
        })
    });
    $("#beg-draw").click(function () {
        layer.confirm("确定要求和嘛？", function (index) {
            $.ajax({
                type: "POST",
                url: "BegDraw"
            });
            layer.close(index);
        })
    });
}

//连接websocket
//TODO(michael)上线时更改url
function connectWebSocket() {
    ws = new WebSocket("ws://www.mytest.com:8088/wuziqi/GameRoomWebSocket");
    ws.onopen = function () {
        sendHeartPackage();
    };
    ws.onmessage = function (e) {
        var data = eval('(' + e.data + ')');
        //刷新页面
        if (data["type"] == "00") {
            window.location.reload();
        }

        //回复心跳包
        if (data["type"] == "01") {
            sendHeartPackage();
        }

        //开始游戏
        if (data["type"] == "02") {
            getGameRoomData();
            let userId = GameRoomData.whoGet;
            loadPlayerHolder();
            initChessPoint();
            loadChess();
            loadCoverDiv(userId);
            loadButtonGroup(userId);
            showNotice("对局开始！")
        }

        //刷新player-status
        if (data["type"] == "03") {
            getGameRoomData();
            loadPlayerHolder();
        }

        //处理后台交换期权请求
        if (data["type"] == "04") {
            getGameRoomData();
            let userId = GameRoomData.whoGet;
            loadPlayerHolder();
            loadChess();
            initChessPoint();
            loadCoverDiv(userId);
            showNotice("轮到你啦！")
        }

        if (data["type"] == "05") {
            getGameRoomData();
            let userId = GameRoomData.whoGet;
            if (userId == data.winnerId) {
                layer.alert("恭喜你获胜了！")
            } else {
                layer.alert("很遗憾你输了！")
            }
            loadPlayerHolder();
            loadCoverDiv(userId);
            loadButtonGroup(userId);
            $("#player-list > tr:first").trigger("onclick");
        }

        if (data["type"] == "06") {
            getGameRoomData();
            let userId = GameRoomData.whoGet;
            layer.alert("平局！");
            loadPlayerHolder();
            loadCoverDiv(userId);
            loadButtonGroup(userId);
            $("#player-list > tr:first").trigger("onclick");
        }

        if (data["type"] == "07") {
            alert("对手逃离！你获胜了！");
            setTimeout(function () {
                window.location.reload();
            }, 500)
        }

        //插入消息
        if (data["type"] == "08") {
            var content = data["data"];
            let userId = GameRoomData.whoGet;
            let username;
            let playerInfo = GameRoomData.playerInfo;
            for (let i = 0; i < playerInfo.length; i++) {
                if (playerInfo[i].userId != userId) {
                    username = playerInfo[i].username;
                    break;
                }
            }
            insertMessage(username, content);
            $("#dialog-content").slimScroll({scrollBy: '300px'});
        }

        //认输
        if (data["type"] == "09") {
            getGameRoomData();
            let userId = GameRoomData.whoGet;
            if (userId == data.looserId) {
                layer.alert("你认输了！")
            } else {
                layer.alert("恭喜你赢了！对手认输！")
            }
            loadPlayerHolder();
            loadCoverDiv(userId);
            loadButtonGroup(userId);
            $("#player-list > tr:first").trigger("onclick");
        }

        //请求和棋
        if (data["type"] == "10") {
            layer.confirm("对手请求和棋", {
                btn: ['同意', '拒绝'],
                yes: function (index) {
                    var data = {type: "02", result: "agree"};
                    var stringData = JSON.stringify(data);
                    ws.send(stringData);
                    layer.close(index);
                },
                btn2: function (index) {
                    var data = {type: "02", result: "deny"};
                    var stringData = JSON.stringify(data);
                    ws.send(stringData);
                    layer.close(index);
                }
            })
        }

        //拒绝和棋
        if (data["type"] == "11") {
            layer.alert("对手拒绝和棋！");
        }

        //关闭页面
        if (data["type"] == "12") {
            window.close();
        }
    };
}

//设置css
function cssSetting() {
    var height = $(window).height() - $("#navbar").height();
    $(".right-part-container").height(height);
    $(".middle-part-container").height(height);
    $(".left-part-container").height(height);
    var widget1BodyHeight = $("#widget-1").height() - 39;
    $("#widget-1>.widget-body").height(widget1BodyHeight);
    var widget2BodyHeight = $("#widget-2").height() - 39;
    $("#widget-2>.widget-body").height(widget2BodyHeight);
    var widget3BodyHeight = $("#widget-3").height() - 39;
    $("#widget-3>.widget-body").height(widget3BodyHeight);
    var messageContentHeight = $("#message-content-wrapper").height();
    $("#message-content").slimScroll({
        height: messageContentHeight + "px",
        start: "bottom"
    });
}

//初始化canvas
function initGamePad() {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 700, 700);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.strokeRect(30, 30, 14 * 45, 14 * 45);
    for (var i = 0; i < 13; i++) {
        ctx.beginPath();
        ctx.moveTo(30 + 45 * (i + 1), 30);
        ctx.lineTo(30 + 45 * (i + 1), 30 + 45 * 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(30, 30 + 45 * (i + 1));
        ctx.lineTo(30 + 45 * 14, 30 + 45 * (i + 1));
        ctx.stroke();
    }
    ctx.fillRect(160, 160, 10, 10);
    ctx.fillRect(160, 520, 10, 10);
    ctx.fillRect(520, 160, 10, 10);
    ctx.fillRect(520, 520, 10, 10);
    ctx.fillRect(340, 340, 10, 10);

}

//加载棋点
function initChessPoint() {
    $(".chess-point").remove();
    if (GameRoomData.gameState == 1) {
        let pointState = GameRoomData.gameInfo.pointState;
        var canvas = document.getElementById("canvas");
        for (var x = 0; x < pointState.length; x++) {
            var coloum = pointState[x];
            for (var y = 0; y < coloum.length; y++) {
                var position = indexToMousePos([x, y], canvas);
                if (pointState[x][y] == 0) {
                    $("body").append("<div class=\"chess-point chess-point-enable\" data-x=\"" + x + "\" data-y=\"" + y + "\" style=\"position: fixed;left:" + (position[0] - 5) + "px;top:" + (position[1] - 5) + "px; z-index: 5;\"></div>");
                } else {
                    $("body").append("<div class=\"chess-point chess-point-disable\" data-x=\"" + x + "\" data-y=\"" + y + "\" style=\"position: fixed;left:" + (position[0] - 5) + "px;top:" + (position[1] - 5) + "px; z-index: 5;\"></div>");
                }
            }
        }
    }

}

//画棋子
function drawChess(ctx, chessType, newIndexX, newIndexY, oldChessType, oldIndexX, oldIndexY) {
    newIndexX = parseInt(newIndexX);
    newIndexY = parseInt(newIndexY);
    var newPoint = indexToCanvasPoint([newIndexX, newIndexY]);
    var newX = newPoint[0];
    var newY = newPoint[1];
    if (chessType == "black") {
        chessType = blackChess;
    } else {
        chessType = whiteChess;
    }
    ctx.drawImage(chessType, newX - 22, newY - 22, 44, 44);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(newX - 10, newY);
    ctx.lineTo(newX + 10, newY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(newX, newY - 10);
    ctx.lineTo(newX, newY + 10);
    ctx.stroke();
    if (oldChessType != undefined) {
        if (oldChessType == "black") {
            oldChessType = blackChess;
        } else {
            oldChessType = whiteChess;
        }
        oldIndexX = parseInt(oldIndexX);
        oldIndexY = parseInt(oldIndexY);
        var oldPoint = indexToCanvasPoint([oldIndexX, oldIndexY]);
        var oldX = oldPoint[0];
        var oldY = oldPoint[1];
        ctx.drawImage(oldChessType, oldX - 22, oldY - 22, 44, 44);
    }
}

function indexToCanvasPoint(index) {
    var xIndex = index[0];
    var yIndex = index[1];
    var x = xIndex * 45 + 30;
    var y = yIndex * 45 + 30;
    return [x, y]
}

//将对应棋盘内的index转化为屏幕的left和top值
function indexToMousePos(index, canvas) {
    var rect = canvas.getBoundingClientRect();
    var left = index[0] * 45 + 30 + rect.left;
    var top = index[1] * 45 + 30 + rect.top;
    return [left, top];
}

//发送获取GameRoomData请求，并产生全局变量GameRoomData
function getGameRoomData() {
    $.ajax({
        type: "get",
        url: "GetGameRoomData",
        async: false,
        success: function (data) {
            GameRoomData = data;
        }
    })
}

//加载屏幕右侧的玩家列表
function loadPlayerList() {
    $("#player-list").empty();
    var playerInfo = GameRoomData.playerInfo;
    for (var i = 0; i < playerInfo.length; i++) {
        var row = playerInfo[i];
        var tr = $("<tr style=\"cursor: pointer;\" onclick=\"loadPlayerDetailInfo(" + i + ")\"></tr>");
        var nameTd = $("<td class=\"center\"></td>");
        nameTd.text(row.username);
        var qqTd = $("<td class=\"center\"></td>");
        if (isEmpty(row.qq)) {
            qqTd.text("未填写");
        } else {
            qqTd.text(row.qq);
        }
        tr.append(nameTd).append(qqTd);
        $("#player-list").append(tr);
    }
}

//加载屏幕右侧的玩家详细列表
function loadPlayerDetailInfo(rowIndex) {
    var row = GameRoomData.playerInfo[rowIndex];
    //avatar
    $("#pdi-avatar").attr("src", row.avatar);
    //用户名
    $("#pdi-username").text(row.username);
    //性别
    if (isEmpty(row.sex)) {
        $("#pdi-sex").text("未填写");
    }
    if (row.sex == 0) {
        $("#pdi-sex").text("男");
    }
    if (row.sex == 1) {
        $("#pdi-sex").text("女");
    }
    //生日
    if (isEmpty(row.birthday)) {
        $("#pdi-birthday").text("未填写");
    } else {
        $("#pdi-birthday").text(row.birthday);
    }
    //总场数
    $("#pdi-game-time").text(row.gameTime);
    //平局次数
    $("#pdi-draw-time").text(row.drawTime);
    //胜率
    var winRate;
    if (row.gameTime == 0) {
        winRate = 0
    } else {
        winRate = Math.round(row.winTime / row.gameTime * 100);
    }
    $("#progressbar>.progress-label").text(winRate + "%");
    $("#progressbar").progressbar({value: winRate});
}

//加载左侧playerHolder
function loadPlayerHolder() {
    var playerInfo = GameRoomData.playerInfo;
    var length = playerInfo.length;
    for (let i = 0; i < length; i++) {
        var row = playerInfo[i];
        if (row.position == "left") {
            $("#left").empty();
            var appendHtml = $("<div class=\"panel panel-info no-margin player-holder-top\" data-id=\"" + row.userId + "\">\n" +
                "                                <div class=\"pull-left player-avatar-holder\">\n" +
                "                                    <img class=\"player-avatar\" src=\"" + row.avatar + "\"/>\n" +
                "                                    <div class=\"width-80 label label-info label-xlg arrowed-in arrowed-in-right center\">\n" +
                "                                        " + row.username + "\n" +
                "                                    </div>\n" +
                "                                </div>\n" +
                "                                <div class=\"pull-right player-status\" data-id=\"" + row.userId + "\">\n" +
                "                                    <span class=\"label label-xlg  label-info player-status-span\">未准备</span>\n" +
                "                                </div>\n" +
                "                            </div>\n" +
                "                            <div class=\"panel panel-info no-margin player-holder-bottom\" data-id=\"" + row.userId + "\">\n" +
                "                                <div class=\"game-info label label-success\">\n" +
                "                                    <div class=\"game-info-row\">\n" +
                "                                        <div class=\"game-info-title pull-left\">\n" +
                "                                            <span>局时:</span>\n" +
                "                                        </div>\n" +
                "                                        <div class=\"game-info-content pull-right\">\n" +
                "                                            <span>10 - 00</span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                    <div class=\"game-info-row\">\n" +
                "                                        <div class=\"game-info-title pull-left\">\n" +
                "                                            <span>步时:</span>\n" +
                "                                        </div>\n" +
                "                                        <div class=\"game-info-content pull-right\">\n" +
                "                                            <span>00 - 00</span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                    <div class=\"game-info-row\">\n" +
                "                                        <div class=\"game-info-title pull-left\">\n" +
                "                                            <span>比分:</span>\n" +
                "                                        </div>\n" +
                "                                        <div class=\"game-info-content pull-right\">\n" +
                "                                            <span>0</span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                </div>\n" +
                "                            </div>");
            $("#left").append(appendHtml);
        }
        if (row.position == "right") {
            $("#right").empty();
            var appendHtml = $("<div class=\"panel panel-info no-margin player-holder-top\" data-id=\"" + row.userId + "\">\n" +
                "                                <div class=\"pull-left player-avatar-holder\">\n" +
                "                                    <img class=\"player-avatar\" src=\"" + row.avatar + "\"/>\n" +
                "                                    <div class=\"width-80 label label-info label-xlg arrowed-in arrowed-in-right center\">\n" +
                "                                        " + row.username + "\n" +
                "                                    </div>\n" +
                "                                </div>\n" +
                "                                <div class=\"pull-right player-status\" data-id=\"" + row.userId + "\">\n" +
                "                                    <span class=\"label label-xlg  label-info player-status-span\">未准备</span>\n" +
                "                                </div>\n" +
                "                            </div>\n" +
                "                            <div class=\"panel panel-info no-margin player-holder-bottom\" data-id=\"" + row.userId + "\">\n" +
                "                                <div class=\"game-info label label-success\">\n" +
                "                                    <div class=\"game-info-row\">\n" +
                "                                        <div class=\"game-info-title pull-left\">\n" +
                "                                            <span>局时:</span>\n" +
                "                                        </div>\n" +
                "                                        <div class=\"game-info-content pull-right\">\n" +
                "                                            <span>10 - 00</span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                    <div class=\"game-info-row\">\n" +
                "                                        <div class=\"game-info-title pull-left\">\n" +
                "                                            <span>步时:</span>\n" +
                "                                        </div>\n" +
                "                                        <div class=\"game-info-content pull-right\">\n" +
                "                                            <span>00 - 00</span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                    <div class=\"game-info-row\">\n" +
                "                                        <div class=\"game-info-title pull-left\">\n" +
                "                                            <span>比分:</span>\n" +
                "                                        </div>\n" +
                "                                        <div class=\"game-info-content pull-right\">\n" +
                "                                            <span>0</span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                </div>\n" +
                "                            </div>");
            $("#right").append(appendHtml);

        }
        loadPlayerStatus(row.userId);
        loadGamePannel(row.userId);
    }
}

//userId为plyaerInfo中的userId
function loadPlayerStatus(userId) {
    $(".player-holder-top[data-id='" + userId + "']>.player-status").empty();
    let gameState = GameRoomData.gameState;
    let playerReadyState;
    let chessType;
    let myTurn;
    if (gameState == 0) {
        let playerInfo = GameRoomData.playerInfo;
        for (let i = 0; i < playerInfo.length; i++) {
            if (playerInfo[i].userId == userId) {
                playerReadyState = playerInfo[i].readyState;
                break;
            }
        }
    } else {
        let gameInfo = GameRoomData.gameInfo;
        chessType = gameInfo.playerState[userId].chessType;
        myTurn = gameInfo.playerState[userId].myTurn;
    }
    let insertHtml;
    if (gameState == 0) {
        insertHtml = $("<span class=\"label label-xlg  label-info player-status-span\">未准备</span>");
        if (playerReadyState == 1) {
            insertHtml.text("已准备")
        }
    } else {
        insertHtml = $("<img class='player-status-img' src='assets/images/game/black.png'/>");
        if (chessType == "white") {
            insertHtml.attr("src", "assets/images/game/white.png");
        }
        if (myTurn) {
            insertHtml.addClass("image-alert");
        }
    }
    $(".player-holder-top[data-id='" + userId + "']>.player-status").append(insertHtml);
}

//TODO(MICHAEL)目前只做胜利次数的刷新别的暂时不做
//userId为plyaerInfo中的userId
function loadGamePannel(userId) {
    let gameInfo = GameRoomData.gameInfo;
    let winTime = 0;
    if (gameInfo != undefined) {
        winTime = gameInfo.playerState[userId].winTime;
    }
    $(".player-holder-bottom[data-id='" + userId + "']>.game-info>.game-info-row:last>.game-info-content>span").text(winTime);
}

//参数userId为whoGet的Id
function loadCoverDiv(userId) {
    $(".cover-div").remove();
    let gameState = GameRoomData.gameState;
    let myTurn;
    if (gameState == 1) {
        let gameInfo = GameRoomData.gameInfo;
        myTurn = gameInfo.playerState[userId].myTurn;
    }
    if (gameState == 0 || (gameState == 1 && !myTurn)) {
        let div = $("<div class='chess-point-disable cover-div' style='width:700px;height: 700px;position: fixed;z-index: 999;'></div>");
        let rect = document.getElementById("canvas").getBoundingClientRect();
        let left = rect.left;
        let top = rect.top;
        div.css("left", left + "px").css("top", top + "px");
        $("body").append(div);
    }

}

//加载棋子
function loadChess() {
    let gameInfo = GameRoomData.gameInfo;
    if (gameInfo != undefined) {
        let length = gameInfo.stepRecord.length;
        if (length != 0) {
            let ctx = document.getElementById("canvas").getContext('2d');
            initGamePad();
            for (let j = 0; j < length; j++) {
                let row = gameInfo.stepRecord[j];
                if (j == 0) {
                    drawChess(ctx, row.chessType, row.point[0], row.point[1]);
                } else {
                    let oldRow = gameInfo.stepRecord[j - 1];
                    drawChess(ctx, row.chessType, row.point[0], row.point[1], oldRow.chessType, oldRow.point[0], oldRow.point[1]);
                }
            }
        } else {
            initGamePad();
        }
    }
}

//TODO(MICHAEL)目前只加载准备按钮别的暂时不做
//参数userId为whoGet的Id
function loadButtonGroup(userId) {
    let gameState = GameRoomData.gameState;
    if (gameState == 0) {
        let playerReadyState;
        let playerInfo = GameRoomData.playerInfo;
        for (let i = 0; i < playerInfo.length; i++) {
            if (playerInfo[i].userId == userId) {
                playerReadyState = playerInfo[i].readyState;
                break;
            }
        }
        $("#beg-draw").addClass("disabled");
        $("#give-up").addClass("disabled");
        if (playerReadyState == 0) {
            $("#ready-btn").removeClass("disabled");
            $("#ready-btn").text("准备");
        } else {
            $("#ready-btn").text("取消准备");
        }
    } else {
        $("#ready-btn").addClass("disabled");
        $("#beg-draw").removeClass("disabled");
        $("#give-up").removeClass("disabled");
    }
}

//发送心跳包
function sendHeartPackage() {
    setTimeout(function () {
        var data = {type: "00"};
        data = JSON.stringify(data);
        ws.send(data);
    }, 500000)
}

//桌面提醒
function showNotice(message) {
    Notification.requestPermission(function (perm) {
        if (perm == "granted") {
            notification = new Notification(message);
        }
    })
}

function insertMessage(username, content) {
    var messageContent = $("#message-content");
    var insertHtml = "<div class=\"message-wrapper\">\n" +
        "                                                <div style=\"font-weight: bold\">" + username + ":</div>\n" +
        "                                                <div class=\"message-to-me\"\n" +
        "                                                     style=\"display: inline-block;margin-left: 10px\">" + content + "\n" +
        "                                                </div>\n" +
        "                                            </div>";
    messageContent.append(insertHtml);
}

function sendMessage(message) {
    var data = {type: "01", message: message};
    var stringData = JSON.stringify(data);
    ws.send(stringData);
}

//html转义
function htmlEncode(value) {
    return $('<div/>').text(value).html();
}

function isEmpty(obj) {
    return typeof obj == "undefined" || obj == null || obj == "";
}
