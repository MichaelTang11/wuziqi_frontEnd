$(function () {
    $.ajax({
        type: "post",
        url: "CheckLoginStatus",
        async: false,
        success: function (obj) {
            var json = eval('(' + obj + ')');
            if (json.status == "True") {
                console.log("用户已登陆!")
            }
            if (json.status == "False") {
                window.location.href = "Login.html";
            }
        }
    });
    //判断页面刷新与关闭代码
    var beforeUnloadTime = 0,
        gapTime = 0;
    var isFireFox = navigator.userAgent.indexOf("Firefox") > -1; //是否是火狐浏览器
    window.onunload = function () {
        gapTime = new Date().getTime() - beforeUnloadTime;
        if (gapTime <= 5) {
            $.ajax({
                type: "POST",
                url: "Logout"
            });
            $.removeCookie('userId',{path:'/'});
        }
    };
    window.onbeforeunload = function () {
        beforeUnloadTime = new Date().getTime();
        if (isFireFox) {
            $.ajax({
                type: "POST",
                url: "Logout"
            });
        } //火狐关闭执行
    };

    init();

    $(window).resize(function () {
        window.location.reload();
    });

    //分组右键事件
    $(document).on('mousedown', '#accordion > div > div >h4.panel-title', function (e) {
        if (3 == e.which) {
            $("#right-click-menu").show();
            var top = $(this).offset().top - 45;
            $("#right-click-menu").css("position", "absolute").css("top", top).css("left", 0).css("z-index", 1000);
            $("#right-click-menu").data("group-name", $(this).text().replace(/\s+/g, ""));
            if ($(this).text().replace(/\s+/g, "") == "我的好友") {
                $("#modify-group-name").addClass("ui-state-disabled").attr("disabled", true);
                $("#delete-group").addClass("ui-state-disabled").attr("disabled", true);
            } else {
                $("#modify-group-name").removeClass("ui-state-disabled").attr("disabled", false);
                $("#delete-group").removeClass("ui-state-disabled").attr("disabled", false);
            }
            $("#menu").hide();
            e.stopPropagation();
        }
    });

    //侧边栏好友选项中点击事件
    $(document).on('click', '.show-menu', function (ev) {
        $("#menu").show();
        var dd_item = $(this).parent().parent();
        var top = dd_item.offset().top - 45;
        $("#menu").css("position", "absolute").css("top", top).css("left", 0).css("z-index", 1000);
        $("#menu").data("friend-id", dd_item.data("friend-id")).data("friend-username", dd_item.data("friend-username"));
        $("#menu-group-list>li").each(function () {
            $(this).removeClass("ui-state-disabled");
        });
        out:
            for (var key in InitData["friendData"]) {
                for (var i = 0; i < InitData["friendData"][key].length; i++) {
                    if (dd_item.data("friend-id") == InitData["friendData"][key][i]["friendId"]) {
                        $("[data-content='" + key + "']").addClass("ui-state-disabled");
                        break out;
                    }
                }
            }
        $("#right-click-menu").hide();

        ev.stopPropagation();
    });

    //menu中点击事件
    $("#menu-container").on("click", "#menu", function (e) {
        $("#menu").show();
        e.stopPropagation();
    });

    $("#menu-container").on("click", "#modify-note", function (e) {
        $("#menu").hide();
        e.stopPropagation();
        layer.prompt({
            title: '请输入备注',
            yes: function (index, layero) {
                var value = layero.find(".layui-layer-input").val().replace(/\s+/g, "");
                var reg = new RegExp("^.{0,10}$");
                if (!reg.test(value)) {
                    alert("备注最大长度为10位！");
                    return;
                }
                var friendId = $("#menu").data("friend-id");
                $.ajax({
                    url: "ModifyNote",
                    type: "POST",
                    data: {friendId: friendId, note: value},
                    success: function (obj) {
                        var returnJson = eval('(' + obj + ')');
                        if (returnJson["status"] == "00") {
                            getInitData();
                            loadSlideBar();
                        }
                    }
                });
                layer.close(index);
            }
        });
    });

    $("#menu-container").on("click", "#send-message", function (e) {
        var friendId = $("#menu").data("friend-id");
        if (activeMessageFriendListItem(friendId) == 1) {
            getInitData();
            loadMessageWidget();
            var dialog_left = $("#top-open-dialog").offset().left - 132 - 550;
            $(".dialog-container").css("top", 0).css("left", dialog_left).show();
            $("#menu").hide();
            $("#info-widget").hide();
            $("#dialog-content").slimScroll({scrollBy: '400px'});
            changeMessageWidgetState(1);
            $("#dialog-content").slimScroll({scrollBy: '400px'});
            e.stopPropagation();
        }
    });

    $("#menu-container").on("click", "#menu-profile", function (e) {
        var username = $("#menu").data("friend-username");
        layer.open({
            area: ['500px', '600px'],
            type: 2,
            content: 'ProfilePage.html?username=' + username
        });
        $("#menu").hide();
        e.stopPropagation();
    });

    $("#menu-container").on("click", "#delete-friend", function (e) {
        layer.confirm('是否要删除好友', {title: '提示'}, function (index) {
            var friendId = $("#menu").data("friend-id");
            $.ajax({
                type: "POST",
                data: {friendId: friendId},
                url: "DeleteFriend",
                success: function (obj) {
                    var returnJson = eval('(' + obj + ')');
                    if (returnJson["status"] == "00") {
                        getInitData();
                        loadSlideBar();
                    }
                }
            });
            layer.close(index);
        });
        $("#menu").hide();
        e.stopPropagation();
    });

    $("#menu-container").on("click", "#menu-group-list > li", function (e) {
        var friendId = $("#menu").data("friend-id");
        var groupName = $(this).data("content");
        $.ajax({
            type: "POST",
            data: {friendId: friendId, groupName: groupName},
            url: "MoveToGroup",
            success: function (obj) {
                var returnJson = eval('(' + obj + ')');
                if (returnJson["status"] == "00") {
                    getInitData();
                    loadSlideBar();
                }

            }
        });
        $("#menu").hide();
        e.stopPropagation();
    });

    //right-click-menu中的事件
    $("#modify-group-name").click(function (e) {
        var oldGroupName = $("#right-click-menu").data("group-name");
        layer.prompt({
                title: '',
                value: oldGroupName
            }, function (newGroupName, index, elem) {
                var reg = new RegExp(".{1,6}");
                var reg2 = new RegExp("^[0-9]");
                if (reg2.test(newGroupName)) {
                    alert("分组名不能以数字开头！");
                    return;
                }
                if (!reg.test(newGroupName)) {
                    alert("分组名最大长度为6位！");
                    return;
                }
                if (oldGroupName == newGroupName) {
                    return;
                } else {
                    for (var groupName in InitData["friendData"]) {
                        if (groupName == newGroupName) {
                            alert("分组名不能与已有分组名相同！");
                            return;
                        }
                    }
                    $.ajax({
                        url: "ModifyGroupName",
                        type: "POST",
                        data: {oldGroupName: oldGroupName, newGroupName: newGroupName},
                        success: function (obj) {
                            var returnJson = eval('(' + obj + ')');
                            if (returnJson["status"] == "00") {
                                getInitData();
                                loadSlideBar();
                                loadMenu();
                            }
                        }
                    });
                }
                layer.close(index);
            }
        );
    });

    $("#delete-group").click(function (e) {
        var value = $("#right-click-menu").data("group-name");
        if (value != "我的好友") {
            $.ajax({
                url: "DeleteGroup",
                type: "POST",
                data: {groupName: value},
                success: function (obj) {
                    var returnJson = eval('(' + obj + ')');
                    if (returnJson["status"] == "00") {
                        getInitData();
                        loadSlideBar();
                        loadMenu();
                    }
                }
            });
        }
    });

    //顶部用户栏点击事件
    $("#setting").click(function () {

        layer.open({
            area: ['500px', '600px'],
            type: 2,
            content: 'SettingPage.html',
            btn: ['确认', '取消'],
            yes: function (index, layero) {
                var reg = new RegExp("^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$");
                var iframeWin = window[layero.find('iframe')[0]['name']];
                var avatar = iframeWin.selectedFile;
                var birthday = layer.getChildFrame('#form-field-date', index).val();
                var sex = layer.getChildFrame("#sex-radio>label>input:checked", index).val();
                var email = layer.getChildFrame("#form-field-email", index).val();
                var qq = layer.getChildFrame("#form-field-qq", index).val();
                var password1 = layer.getChildFrame("#form-field-pass1", index).val();
                var password2 = layer.getChildFrame("#form-field-pass2", index).val();
                if (isEmpty(birthday)) {
                    alert("生日不能空！");
                    return;
                }
                if (isEmpty(sex)) {
                    alert("性别必选！");
                    return;
                }
                if (isEmpty(email)) {
                    alert("邮箱不能空！");
                    return;
                }
                if (!reg.test(email)) {
                    alert("邮箱格式不正确！");
                    return;
                }
                if (isEmpty(qq)) {
                    alert("qq号不能空");
                    return;
                }
                if (password1 != password2) {
                    alert("两次输入的密码不同！");
                    return;
                } else {
                    if (password1 != "" && password2 != "") {
                        //发送重置密码请求
                        var username = InitData["userData"]["username"];
                        var code = hex_md5(username + password1);
                        $.post("ResetPassword", {"username": username, "code": code});
                    }
                }
                if (avatar != null) {
                    var formData = new FormData();
                    formData.append('avatar', avatar);
                    $.ajax({
                        type: "POST",
                        url: "ModifyUserAvatar",
                        data: formData,
                        contentType: false,
                        processData: false
                    });
                }
                $.ajax({
                    type: "POST",
                    url: "ModifyUserInfo",
                    data: {birthday: birthday, sex: sex, email: email, qq: qq}
                });
                //更新首页用户头像
                getInitData();
                $("#navbar-container > div.navbar-buttons.navbar-header.pull-right > ul > li.light-blue.dropdown-modal > a > img").attr("src", InitData["userData"]["avatar"]);
                layer.close(index);
            }
        })
    });

    $("#profile").click(function () {
        layer.open({
            area: ['500px', '600px'],
            type: 2,
            content: 'ProfilePage.html?username=' + InitData["userData"]["username"]
        })
    });

    $("#logout").click(function () {
        $.ajax({
            type: "POST",
            url: "Logout",
            async: false,
            success: function (obj) {
                var returnJson = eval('(' + obj + ')');
                if (returnJson["status"] == "00") {
                    window.location.href = "Login.html";
                }
            }
        });
    });

    // slider-bar点击非按钮部分隐藏menu
    // window.onmousedown = function (ev) {
    //     var element = ev.target;
    //     while (element) {
    //         if (element.id== "menu" || element.id == "show-menu" || element.id=="player-dialog" || element.id=="info-widget") {
    //             console.log("判断成功");
    //             return;
    //         }
    //         element = element.parentNode;
    //     }
    //     $("#menu").hide();
    //     $('#player-dialog').hide();
    //     $("#info-widget").hide();
    // }; 此方法为最初的原始方法，占用系统资源较多当dom节点较多click次数较多的情况下可能会导致程序崩溃

    //最新方法通过在body节点中绑定hide事件，然后在menu显示的地方使用stopPropagation函数取消 body中的hide事件冒泡
    document.body.onclick = function () {
        $("#menu").hide();
        $("#right-click-menu").hide();
        $('#player-dialog').hide();
        $("#info-widget").hide();
        changeMessageWidgetState(0);
    };

    //顶部按钮点击事件
    $('#info-widget').click(function (e) {
        $('#info-widget').show();
        e.stopPropagation();
    });

    //侧边栏toolbar按钮点击事件
    $("#add_player").click(function () {
        layer.prompt({
                title: '请输入好友昵称'
            }, function (value, index, elem) {
                if (value == InitData["userData"]["username"]) {
                    alert("不可以加自己为好友哦！");
                    return;
                }
                $.ajax({
                    url: "AddFriend",
                    type: "POST",
                    data: {username: value},
                    success: function (str) {
                        var returnJson = eval('(' + str + ')');
                        if (returnJson["status"] == "00") {
                            alert("好友请求已发送至" + value);
                        } else {
                            if (returnJson["status"] == "01") {
                                alert("该用户不存在！");
                            } else {
                                if (returnJson["status"] == "02") {
                                    alert("该用户已为您的好友！");
                                } else {
                                    alert("您已向该用户发送过请求！");
                                }
                            }
                        }
                    }
                });
                layer.close(index);
            }
        );
    });

    $("#add_group").click(function () {
        layer.prompt({
                title: "请输入分组名"
            }, function (value, index) {
                value = value.replace(/\s+/g, "");
                var reg = new RegExp(".{1,6}");
                var reg2 = new RegExp("^[0-9]");
                if (reg2.test(value)) {
                    alert("分组名不能以数字开头！");
                    return;
                }
                if (!reg.test(value)) {
                    alert("分组名最大长度为6位！");
                    return;
                }
                for (var groupName in InitData["friendData"]) {
                    if (groupName == value) {
                        alert("分组名不能与已有分组名相同！");
                        return;
                    }
                }
                $.ajax({
                    url: "AddGroup",
                    type: "POST",
                    data: {groupName: value},
                    success: function (obj) {
                        var returnJson = eval('(' + obj + ')');
                        if (returnJson["status"] == "00") {
                            getInitData();
                            loadSlideBar();
                            loadMenu();
                        }
                    }
                });
                layer.close(index);
            }
        );
    });

    //信息通知框相关js
    $("#top-open-info").click(function (ev) {
        var info_width = $("#info-widget").width();
        var slide_width = $("#sidebar").width();
        var info_left = $("#top-open-info").offset().left - info_width - slide_width + $("#top-open-info").parent().width();
        if (InitData["notificationData"].length == 0) {
            layer.alert("当前通知列表内无通知！")
        } else {
            $("#info-widget").css("top", 0).css("left", info_left).show();
            $('#player-dialog').hide();
            $("#menu").hide();
            $("#right-click-menu").hide();
            ev.stopPropagation();
        }
    });

    $("#info-widget>.widget-header>.widget-toolbar>i").click(function (e) {
        $("#info-widget").hide();
        e.stopPropagation();
    });

    //消息通知同意与拒绝的按钮事件
    $("#info-widget").on("click", ".agree", function () {
        var fromId = $(this).parent().parent('.alert').data("from-id");
        $.ajax({
            type: "POST",
            url: "AgreeAddFriend",
            data: {fromId: fromId},
            success: function (obj) {
                var returnJson = eval('(' + obj + ')');
                if (returnJson["status"] == "00") {
                    getInitData();
                    loadInfoList();
                    loadSlideBar();
                    var preview = $(this).parent().parent('.alert').prevAll();
                    var next = $(this).parent().parent('.alert').nextAll();
                    if (preview.length == 0 && next.length == 0) {
                        $('#info-widget').hide();
                    }
                }
            }
        });
    });
    $("#info-widget").on("click", ".deny", function () {
        var fromId = $(this).parent().parent('.alert').data("from-id");
        $.ajax({
            type: "POST",
            url: "DenyAddFriend",
            data: {fromId: fromId},
            success: function (obj) {
                var returnJson = eval('(' + obj + ')');
                if (returnJson["status"] == "00") {
                    getInitData();
                    loadInfoList();
                    var preview = $(this).parent().parent('.alert').prevAll();
                    var next = $(this).parent().parent('.alert').nextAll();
                    if (preview.length == 0 && next.length == 0) {
                        $('#info-widget').hide();
                    }
                }
            }
        });
    });

    //对话框相关js
    $('#player-dialog').click(function (e) {
        $('#player-dialog').show();
        e.stopPropagation();
    });

    $(document).on("mouseover", "#dialog-user-list>.list-group-item", function () {
        $(this).find("i").show();
    });

    $(document).on("mouseout", "#dialog-user-list>.list-group-item", function () {
        $(this).find("i").hide();
    });

    $("#widget-dialog-user-list").on("click", ".cross", function (ev) {
        var preview = $(this).parent(".list-group-item").prevAll();
        var next = $(this).parent(".list-group-item").nextAll();
        var friendId = $(this).parent(".list-group-item").data("friend-id");
        if (deleteFriendListItem(friendId) == 1) {
            if (preview.length == 0 && next.length == 0) {
                $('#player-dialog').hide();
            }
            getInitData();
            loadMessageFriendList();
            loadMessageList();
        }
        ev.stopPropagation();
    });

    $("#widget-dialog-user-list").on("click", "#dialog-user-list>.list-group-item", function (ev) {
        var friendId = $(this).data("friend-id");
        activeMessageFriendListItem(friendId);
        clearMessageNotice(friendId);
        var item = $('#dialog-user-list>.list-group-item');
        item.each(function () {
            $(this).removeClass("active");
        });
        $(this).removeClass("message-alert").attr("style", "");
        $(this).addClass("active");
        getInitData();
        loadMessageList();
        ev.stopPropagation();
    });

    $("#top-open-dialog").click(function (ev) {
        if (InitData["messageData"]["messageFriendList"].length == 0) {
            layer.alert("当前消息列表中没有会话对象，请从好友列表中添加！");
            return;
        }
        var messageFriendList = InitData["messageData"]["messageFriendList"];
        for (var key in messageFriendList) {
            if (messageFriendList[key]["activeState"] == 1 && messageFriendList[key]["messageNumber"] != 0) {
                clearMessageNotice(messageFriendList[key]["friendId"]);
            }
        }
        var dialog_left = $("#top-open-dialog").offset().left - 132 - 550;
        $(".dialog-container").css("top", 0).css("left", dialog_left).show();
        $("#info-widget").hide();
        $("#menu").hide();
        $("#right-click-menu").hide();
        $("#dialog-content").slimScroll({scrollBy: '400px'});
        changeMessageWidgetState(1);
        $('#dialog-content').slimScroll({
            scrollBy: "500px"
        });
        ev.stopPropagation();
    });

    $("#player-dialog-collapse").click(function (ev) {
        $(".dialog-container").hide();
        changeMessageWidgetState(0);
        ev.stopPropagation();
    });

    //回车发送消息事件
    $(document).keyup(function (e) {
        if (e.keyCode == 13) {
            var message = $("#message-input").val();
            if (isEmpty(message)) {
                return;
            }
            var messageFriendList = InitData["messageData"]["messageFriendList"];
            var friendId;
            for (var key in messageFriendList) {
                if (messageFriendList[key]["activeState"] == 1) {
                    friendId = messageFriendList[key]["friendId"];
                    break;
                }
            }
            message = htmlEncode(message);
            sendMessage(friendId, message);
            insertMessage(0, message);
            $("#message-input").val("");
            $("#dialog-content").slimScroll({scrollBy: '300px'});

        }
    });

    //游戏大厅相关js
    $("#game-lobby-content").on("click", ".player-holder-right, .player-holder-left", function () {
        var position = "";
        if ($(this).hasClass("player-holder-right")) {
            position = "right";
        } else {
            position = "left";
        }
        var tableId = $(this).parents(".table-wrapper").data("table-id");
        $.ajax({
            type: "POST",
            url: "SitDown",
            data: {position: position, tableId: tableId},
            success: function (obj) {
                var returnJson = eval('(' + obj + ')');
                if (returnJson["status"] == "01") {
                    alert("已经处于游戏状态无法换桌");
                }
                if (returnJson["status"] == "00") {
                    window.open("GameRoom.html")
                }
            }
        });

    })
});

//以下部分为一些函数
//获取初始数据
function getInitData() {
    $.ajax({
        type: "get",
        url: "GetInitData",
        async: false,
        success: function (obj) {
            InitData = eval('(' + obj + ')');
        }
    });
}

//加载menu此处必须删除原页面上的menu元素然后重新使用jquery ui的方法去初始化
function loadMenu() {
    $("#menu").remove();
    $("#menu-container").append(oldMenuHtml);
    loadMenuGroupList();
    $("#menu").menu();
}

//加载好友列表
function loadSlideBar() {
    $('#accordion').empty();
    for (var groupName in InitData["friendData"]) {
        var htmlContent = "<div class=\"panel panel-default\">\n" +
            "                                <div class=\"panel-heading\">\n" +
            "                                    <h4 class=\"panel-title\">\n" +
            "                                        <a class=\"accordion-toggle collapsed\" data-toggle=\"collapse\"\n" +
            "                                           data-parent=\"#accordion\"\n" +
            "                                           href=\"#" + groupName + "\" style=\"font-weight: 700;\">\n" +
            "                                            <i class=\"ace-icon fa fa-angle-right bigger-110\"\n" +
            "                                               data-icon-hide=\"ace-icon fa fa-angle-down\"\n" +
            "                                               data-icon-show=\"ace-icon fa fa-angle-right\"></i>\n" +
            "                                            &nbsp;" + groupName + "\n" +
            "                                        </a>\n" +
            "                                    </h4>\n" +
            "                                </div>\n" +
            "                                <div class=\"panel-collapse collapse\" id=\"" + groupName + "\">\n" +
            "                                    <div class=\"panel-body no-padding\">\n" +
            "                                        <div class=\"dd\" id=\"nestable\">\n" +
            "                                            <ol class=\"dd-list\">\n";
        for (var i = 0; i < InitData["friendData"][groupName].length; i++) {
            var friend = InitData["friendData"][groupName][i];
            var state;
            switch (friend["state"]) {
                case 0:
                    state = "离线";
                    break;
                case 1:
                    state = "在线";
                    break;
                case 2:
                    state = "游戏中";
                    break;
            }
            var bubble;
            switch (friend["loginState"]) {
                case 0:
                    bubble = "far";
                    break;
                case 1:
                    bubble = "fas";
                    break;
            }

            var title;
            if (friend["note"] != undefined && friend["note"] != "" && friend["note"] != null) {
                title = "title=\"" + friend["note"] + "\"";
            } else {
                title = "";
            }

            var innerHtmlContent =
                "                                               <li class=\"dd-item \" " + title + " data-friend-id=\"" + friend["friendId"] + "\" data-friend-username=\"" + friend["friendUsername"] + "\">\n" +
                "                                                    <div class=\"dd-handle slide-dd-handler\">\n" +
                "                                                        <i class=\"" + bubble + " fa-lightbulb bigger-140 pull-left margin-top8 margin-right5\"></i>\n" +
                "                                                        <img class=\"slide-img\" src=\"" + friend["avatar"] + "\" />\n" +
                "                                                        <div style=\"display: inline-block;font-size: 12px;\">\n" +
                "                                                            <div>" + friend["friendUsername"] + "</div>\n" +
                "                                                            <div style=\"color: gray;\">" + state + "</div>\n" +
                "                                                        </div>\n" +
                "                                                        <span class=\"fas fa-angle-right pull-right bigger-140 margin-top8 show-menu\"></span>\n" +
                "                                                    </div>\n" +
                "                                                </li>\n";
            htmlContent = htmlContent + innerHtmlContent;

        }
        htmlContent +
        "                                            </ol>\n" +
        "                                        </div>\n" +
        "                                    </div>\n" +
        "                                </div>\n" +
        "                            </div>";
        $('#accordion').append(htmlContent);
    }
}

//加载menu中group-list
function loadMenuGroupList() {
    $("#menu-group-list").empty();
    for (var key in InitData["friendData"]) {
        $("#menu-group-list").append("<li data-content=\"" + key + "\">" + key + "</li>");
    }
}

//加载通知列表
function loadInfoList() {
    $("#top-open-info>i").removeClass("icon-animated-bell");
    $("#top-open-info>.badge").remove();
    $("#info-widget>.widget-body>.widget-main>.scroll-content").empty();
    var notificationList = InitData["notificationData"];
    var infoNumber = notificationList.length;
    if (infoNumber != 0) {
        $("#top-open-info>i").addClass("icon-animated-bell");
        $("#top-open-info").append("<span class=\"badge badge-important\">" + infoNumber + "</span>");
        for (var i = 0; i < infoNumber; i++) {
            $("#info-widget>.widget-body>.widget-main>.scroll-content").append("<div data-from-id=\"" + notificationList[i]["fromId"] + "\" class=\"alert alert-block alert-info margin-top5 no-margin-bottom\">\n" +
                "                                    <p>\n" +
                "                                        <strong>\n" +
                "                                            " + notificationList[i]["fromUsername"] + "\n" +
                "                                        </strong>\n" +
                "                                        请求添加您为好友\n" +
                "                                    </p>\n" +
                "\n" +
                "                                    <p>\n" +
                "                                        <button class=\"btn btn-sm btn-success pull-left agree\"><i\n" +
                "                                                class=\"ace-icon fa fa-check\"></i>同意\n" +
                "                                        </button>\n" +
                "                                        <button class=\"btn btn-sm pull-right deny\"><i\n" +
                "                                                class=\"ace-icon fa fa-times red2\"></i>拒绝\n" +
                "                                        </button>\n" +
                "                                        <div class=\"clearfix\"></div>\n" +
                "                                    </p>\n" +
                "\n" +
                "                                </div>");
        }
        showNotice();
    }
}

//加载game-table
function loadGameTable(height) {
    var game_lobby_content = $("#game-lobby-content");
    game_lobby_content.empty();
    var gameTableData = InitData["gameTableData"];
    for (var i = 1; i <= 100; i++) {
        var tableInfo = gameTableData[i - 1];
        var insertHtml = "<div class=\"table-wrapper\" data-table-id=\"" + i + "\">\n" +
            "                                    <p class=\"no-margin player-name-left\" >";
        if (tableInfo["leftUsername"] != null) {
            insertHtml = insertHtml + tableInfo["leftUsername"] + "</p>\n" +
                "                                    <div class=\"table-wrapper-main\">\n" +
                "                                        <div class=\"center player-holder-left-hp\">\n" +
                "                                            <img class=\"player-holder-image\" src=\"" + tableInfo["leftAvatar"] + "\"  alt=\"user avatar\"/>\n" +
                "                                        </div>\n";
        } else {
            insertHtml = insertHtml + "</p>\n" +
                "                                    <div class=\"table-wrapper-main\">\n" +
                "                                        <div class=\"center player-holder-left\">\n" +
                "                                            <span class=\"fas fa-question\"></span>\n" +
                "                                        </div>\n";
        }
        if (tableInfo["gameState"] == 0) {
            insertHtml = insertHtml + "                                        <img  class=\"img-table\" src=\"assets\\images\\game_table.png\">\n"
        } else {
            insertHtml = insertHtml + "                                        <img  class=\"img-table\" src=\"assets\\images\\start_table.png\">\n"
        }
        if (tableInfo["rightUsername"] != null) {
            insertHtml = insertHtml + "                                        <div class=\"center player-holder-right-hp\">\n" +
                "                                             <img class=\"player-holder-image\" src=\"" + tableInfo["rightAvatar"] + "\" alt=\"user avatar\"/>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                    <p class=\"player-name-right\">" + tableInfo["rightUsername"] + "</p>\n"
        } else {
            insertHtml = insertHtml + "                                        <div class=\"center player-holder-right\">\n" +
                "                                            <span class=\"fas fa-question\"></span>\n" +
                "                                        </div>\n" +
                "                                    </div>\n" +
                "                                    <p class=\"player-name-right\"></p>\n"
        }
        insertHtml = insertHtml + "                                    <p class=\"table-id\">-" + i + "-</p>\n" +
            "                                </div>";
        game_lobby_content.append(insertHtml);
    }
    $('#game-lobby-content').ace_scroll({
        size: height
    });
}

//加载messageList
function loadMessageWidget() {
    loadMessageAlertBubble();
    loadMessageFriendList();
    loadMessageList();
}

//加载消息通知气泡
function loadMessageAlertBubble() {
    var messageFriendList = InitData["messageData"]["messageFriendList"];
    $("#top-open-dialog>i").removeClass("icon-animated-vertical");
    $("#top-open-dialog>.badge").remove();
    var newMessageNumber = 0;
    for (var key in messageFriendList) {
        newMessageNumber = newMessageNumber + messageFriendList[key]["messageNumber"];
    }
    if (newMessageNumber != 0) {
        $("#top-open-dialog>i").addClass("icon-animated-vertical");
        $("#top-open-dialog").append("<span class=\"badge badge-success\">" + newMessageNumber + "</span>");
        showNotice();
    }
}

//加载消息框中的好友列表
function loadMessageFriendList() {
    var messageFriendList = InitData["messageData"]["messageFriendList"];
    $("#dialog-user-list").empty();
    for (var key in messageFriendList) {
        if (messageFriendList[key]["messageNumber"] != 0) {
            if (messageFriendList[key]["activeState"] == 1) {
                var insertHtml = "<li class=\"list-group-item active\" data-friend-id=\"" + messageFriendList[key]["friendId"] + "\">\n";
            } else {
                var insertHtml = "<li class=\"list-group-item message-alert\" data-friend-id=\"" + messageFriendList[key]["friendId"] + "\">\n";
            }
        } else {
            if (messageFriendList[key]["activeState"] == 1) {
                var insertHtml = "<li class=\"list-group-item active\" data-friend-id=\"" + messageFriendList[key]["friendId"] + "\">\n";
            } else {
                var insertHtml = "<li class=\"list-group-item \" data-friend-id=\"" + messageFriendList[key]["friendId"] + "\">\n";
            }

        }
        var insertHtml = insertHtml +
            "                                            <img src=\"" + messageFriendList[key]["avatar"] + "\" class=\"round-img\"\n" +
            "                                                 alt=\"user avatar\"/>\n" +
            "                                            <span class=\"menu-text\">" + messageFriendList[key]["username"] + "</span>\n" +
            "                                            <i class=\"ace-icon glyphicon glyphicon-remove pull-right margin-top16 cross\"\n" +
            "                                               style=\"display: none\"></i>\n" +
            "                                        </li>";
        $("#dialog-user-list").append(insertHtml);
    }
    if (messageFriendList.length == 0) {
        $('#player-dialog').hide();
        changeMessageWidgetState(0);
    }
}

//加载消息列表
function loadMessageList() {
    var messageFriendList = InitData["messageData"]["messageFriendList"];
    var messageList = [];
    for (var key in messageFriendList) {
        if (messageFriendList[key]["activeState"] == 1) {
            $("#message-username").text(messageFriendList[key]["username"]);
            messageList = getMessageList(messageFriendList[key]["friendId"]);
            break;
        }
    }
    $("#player-dialog>div:eq(1)>.widget-body>.widget-main").empty().append("<div id=\"dialog-content\"></div>");
    for (var key in messageList) {
        insertMessage(messageList[key]["type"], messageList[key]["content"]);
    }
    $("#dialog-content").slimScroll({
        height: '241px',
        start: "bottom"
    });
}

//插入消息
function insertMessage(insertType, content) {
    var dialogContent = $("#dialog-content");
    switch (insertType) {
        case 1:
            var insertHtml = "<div class=\"message-wrapper\">\n" +
                "                                            <p class=\"message-to-me no-margin\">" + content + "</p>\n" +
                "                                            <div class=\"clearfix\"></div>\n" +
                "                                        </div>";
            dialogContent.append(insertHtml);
            break;
        case 0:
            var insertHtml = "<div class=\"message-wrapper\">\n" +
                "                                            <p class=\"message-to-other no-margin\">" + content + "</p>\n" +
                "                                            <div class=\"clearfix\"></div>\n" +
                "                                        </div>";
            dialogContent.append(insertHtml);
            break;
    }
}

//向后台发送active消息好友列表指令
function activeMessageFriendListItem(friendId) {
    var returnResult = 0;
    $.ajax({
        type: "POST",
        url: "ActiveMessageFriendListItem",
        data: {"friendId": friendId},
        async: false,
        success: function (obj) {
            var returnJson = eval('(' + obj + ')');
            if (returnJson["status"] == "00") {
                returnResult = 1;
            }
        }
    });
    return returnResult;
}

//向后台发送delete消息好友列表指令
function deleteFriendListItem(friendId) {
    var returnResult = 0;
    $.ajax({
        type: "POST",
        url: "DeleteFriendListItem",
        data: {"friendId": friendId},
        async: false,
        success: function (obj) {
            var returnJson = eval('(' + obj + ')');
            if (returnJson["status"] == "00") {
                returnResult = 1;
            }
        }
    });
    return returnResult;
}

//向后台获取消息列表
function getMessageList(friendId) {
    var messageList = [];
    $.ajax({
        type: "GET",
        url: "GetMessageList",
        data: {"friendId": friendId},
        async: false,
        success: function (obj) {
            messageList = eval('(' + obj + ')');
        }
    });
    return messageList;
}

//发送消息函数
function sendMessage(friendId, message) {
    var data = {type: "01", friendId: friendId, message: message};
    var stringData = JSON.stringify(data);
    ws.send(stringData);
}

//清除消息提示
function clearMessageNotice(friendId) {
    var data = {type: "02", friendId: friendId};
    var stringData = JSON.stringify(data);
    ws.send(stringData);
}

//向后台发送更改消息框显示状态的请求
function changeMessageWidgetState(widgetState) {
    $.ajax({
        type: "POST",
        url: "ChangeMessageWidgetState",
        data: {widgetState: widgetState},
        success: function () {
            getInitData();
        }
    })
}

//桌面提醒
function showNotice() {
    Notification.requestPermission(function (perm) {
        if (perm == "granted") {
            notification = new Notification("您有新消息！");
        }
    })
}

//发送心跳包
function sendHeartPackage() {
    setTimeout(function () {
        var data = {type: "03"};
        data = JSON.stringify(data);
        ws.send(data);
    }, 500000)
}

//页面初始化
function init() {
    getInitData();
    //页面初始设置
    var height = window.innerHeight - 75 - 45;
    $("#sidebar>div").css("height", height);
    $("#game-lobby").css("height", height - 8);
    $("#widget-dialog-user-list").ace_scroll({size: 368});
    $("#info-widget>.widget-body>.widget-main").ace_scroll({size: 305});

    //全局禁止鼠标右击事件
    document.oncontextmenu = function () {
        return false;
    };

    //闪烁提示动画
    var colorFlag = 0;

    function changeColor() {
        if (!colorFlag) {
            $(".message-alert").css("background", "#FF9B1A");
            colorFlag = 1;
        } else {
            $(".message-alert").css("background", "");
            colorFlag = 0;
        }
    }

    setInterval(changeColor, 500);

    //建立websocket连接
    ws = new WebSocket("wss://www.michaeltang.xyz/wuziqi/HomeWebSocket");
    ws.onopen = function () {
        sendHeartPackage();
    };
    ws.onmessage = function (e) {
        var data = eval('(' + e.data + ')');
        //刷新好友列表
        if (data["type"] == "01") {
            getInitData();
            loadSlideBar();
        }
        //刷新通知框
        if (data["type"] == "02") {
            getInitData();
            loadInfoList();
        }
        //刷新消息列表
        if (data["type"] == "03") {
            getInitData();
            //刷新提示气泡
            if (data["subType"] == "01") {
                loadMessageAlertBubble();
            }
            //插入信息
            if (data["subType"] == "02") {
                var message = data["data"];
                insertMessage(1, message);
                $("#dialog-content").slimScroll({scrollBy: '300px'});
            }
            //刷新messageFriendList
            if (data["subType"] == "03") {
                loadMessageFriendList();
            }
            //整体刷新
            if (data["subType"] == "04") {
                loadMessageWidget();
            }
        }
        //接受后台信息更新game-table
        if (data["type"] == "04") {
            var refreshData = data["refreshData"];
            for (var key in refreshData) {
                var temp = refreshData[key];
                var tableWrapper = $("div[data-table-id='" + temp["tableId"] + "']");
                var tableWrapperMain = tableWrapper.children(".table-wrapper-main");
                tableWrapperMain.children(":first").remove();
                if (temp["leftUsername"] == null) {
                    var insertHtml = "<div class=\"center player-holder-left\">\n" +
                        "                                            <span class=\"fas fa-question\"></span>\n" +
                        "                                        </div>";
                    tableWrapperMain.prepend(insertHtml);
                } else {
                    var insertHtml = "<div class=\"center player-holder-left-hp\">\n" +
                        "                                             <img class=\"player-holder-image\" src=\"" + temp["leftAvatar"] + "\" alt=\"user avatar\"/>\n" +
                        "                                        </div>";
                    tableWrapperMain.prepend(insertHtml);
                }
                if (temp["gameState"] == 0) {
                    tableWrapperMain.children("img").attr("src", "assets/images/game_table.png");
                } else {
                    tableWrapperMain.children("img").attr("src", "assets/images/start_table.png");
                }
                tableWrapperMain.children(":last").remove();
                if (temp["rightUsername"] == null) {
                    var insertHtml = "<div class=\"center player-holder-right\">\n" +
                        "                                            <span class=\"fas fa-question\"></span>\n" +
                        "                                        </div>";
                    tableWrapperMain.append(insertHtml);
                } else {
                    var insertHtml = "<div class=\"center player-holder-right-hp\">\n" +
                        "                                             <img class=\"player-holder-image\" src=\"" + temp["rightAvatar"] + "\" alt=\"user avatar\"/>\n" +
                        "                                        </div>";
                    tableWrapperMain.append(insertHtml);
                }
                tableWrapper.children(".player-name-left").text(temp["leftUsername"]);
                tableWrapper.children(".player-name-right").text(temp["rightUsername"]);
            }
        }
        //发送心跳包维持长连接
        if (data["type"] == "05") {
            sendHeartPackage();
        }
    };


    //修改顶部栏的username
    $("#username").text(InitData["userData"]["username"]);

    //修改用户头像
    $("#navbar-container > div.navbar-buttons.navbar-header.pull-right > ul > li.light-blue.dropdown-modal > a > img").attr("src", InitData["userData"]["avatar"]);

    //加载好友列表
    loadSlideBar();

    //获取原始menu的html
    getOldMenuHtml();

    //menu中group-list加载
    loadMenuGroupList();

    //加载game-table
    loadGameTable(height - 8);

    $('.comments').ace_scroll({
        size: height
    });

    loadInfoList();

    loadMessageWidget();

    //判断是否第一次登录
    if (InitData["userData"]["ifFirstLogin"] == 1) {
        layer.msg('首次登录，请前往个人信息设置页面，设置个人信息！', {
            offset: 't',
            time: 2000
        })
    }

    $("#menu").menu();

    $("#right-click-menu").menu();
}

//获取原始状态的menu
function getOldMenuHtml() {
    oldMenuHtml = $("#menu").prop("outerHTML");
}

function isEmpty(obj) {
    return typeof obj == "undefined" || obj == null || obj == "";
}//判断字符串是否为空

//html转义
function htmlEncode(value) {
    return $('<div/>').text(value).html();
}

function clearCookie() {
    var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
    if (keys) {
        for (var i = keys.length; i--;) {
            document.cookie = keys[i] + '=0;path=/wuziqi/;expires=' + new Date(0).toUTCString();//清除当前域名下的,例如：m.kevis.com
            document.cookie = keys[i] + '=0;path=/wuziqi/;domain=' + document.domain + ';expires=' + new Date(0).toUTCString();//清除当前域名下的，例如 .m.kevis.com
            document.cookie = keys[i] + '=0;path=/wuziqi/;domain=kevis.com;expires=' + new Date(0).toUTCString();//清除一级域名下的或指定的，例如 .kevis.com
        }
    }
}