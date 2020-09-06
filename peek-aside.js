/**
 * This plugin is pretty much just a demo
 * of how to instantiate extra Ace instances.
 */
(function() {
	var MenuItem = Electron_MenuItem;
	//
	var ready = false;
	var sizer, splitter, container, editor, session, mainCont, peekCommand;
	//
	var gmlFile = null;
	function forceUpdate() {
		var e = new CustomEvent("resize");
		e.initEvent("resize");
		window.dispatchEvent(e);
	}
	function hide() {
		if (gmlFile == null) return;
		GMEdit.off("fileClose", onFileClose);
		GMEdit.off("fileSave", onFileSave);
		mainCont.removeChild(sizer);
		mainCont.removeChild(container);
		gmlFile = null;
		forceUpdate();
		setTimeout(() => aceEditor.focus());
	}
	function show(file) {
		if (!file.codeEditor) return;
		if (gmlFile == file) return;
		if (gmlFile == null) {
			GMEdit.on("fileClose", onFileClose);
			GMEdit.on("fileSave", onFileSave);
			if (ready) {
				mainCont.appendChild(sizer);
				mainCont.appendChild(container);
			} else prepare();
			forceUpdate();
		}
		gmlFile = file;
		//
		session = GMEdit.aceTools.cloneSession(file.codeEditor.session);
		editor.setSession(session);
	}
	function onFileSave(e) {
		if (e.file == gmlFile) {
			session.bgTokenizer.start(0);
		}
	}
	function onFileClose(e) {
		if (e.file == gmlFile) hide();
	}
	//
	function prepare() {
		ready = true;
		container = document.createElement("div");
		container.classList.add("ace_container");
		//
		sizer = document.createElement("div");
		var editor_id = "aside_editor";
		sizer.setAttribute("splitter-element", "#"+editor_id);
		sizer.setAttribute("splitter-lskey", "aside_width");
		sizer.setAttribute("splitter-default-width", "" + (aceEditor.container.clientWidth >> 1));
		sizer.classList.add("splitter-td");
		//
		var nextCont = document.createElement("div");
		nextCont.classList.add("ace_container");
		// .ace_container[editor] -> .ace_container[.ace_container[editor], splitter, .ace_container[aside_editor]]:
		mainCont = aceEditor.container.parentElement;
		var mainChildren = [];
		for (var i = 0; i < mainCont.children.length; i++) mainChildren.push(mainCont.children[i]);
		for (var i = 0; i < mainChildren.length; i++) {
			var ch = mainChildren[i];
			mainCont.removeChild(ch);
			nextCont.appendChild(ch);
		}
		mainCont.style.setProperty("flex-direction", "row");
		mainCont.appendChild(nextCont);
		mainCont.appendChild(sizer);
		mainCont.appendChild(container);
		//
		var textarea = document.createElement("textarea");
		container.appendChild(textarea);
		editor = GMEdit.aceTools.createEditor(textarea);
		//
		container.id = editor_id;
		splitter = new GMEdit_Splitter(sizer);
		// add a "Hide aside" menu item to our side view's context menu:
		editor.commands.addCommand({
			name: "exitPeekAside",
			bindKey: "Escape|Ctrl-W",
			exec: function(e) {
				for (let tab of $gmedit["ui.ChromeTabs"].element.querySelectorAll(".chrome-tab")) {
					if (tab.gmlFile != e.session.gmlFile) continue;
					hide();
					if (!tab.classList.contains("chrome-tab-current")) {
						tab.querySelector(".chrome-tab-close").click();
					}
					break;
				}
			}
		});
		editor.commands.addCommand({
			name: "saveFile",
			bindKey: {win: "Ctrl-S", mac: "Command-S"},
			exec: function(e) {
				let file = e.session.gmlFile;
				if (file && file.save()) {
					setTimeout(() => {
						if (file.codeEditor.session.getUndoManager().isClean()) {
							e.session.getUndoManager().markClean();
						}
					});
				}
			}
		});
		editor.commands.addCommand(peekCommand);
	}
	//
	function openWrap(fn, e) {
		e = e || aceEditor;
		var prevTab = $gmedit["ui.ChromeTabs"].element.querySelector(".chrome-tab.chrome-tab-current");
		if (!prevTab) return;
		fn();
		var nextTab = $gmedit["ui.ChromeTabs"].element.querySelector(".chrome-tab.chrome-tab-current");
		if (!nextTab || nextTab == prevTab) return;
		var file = nextTab.gmlFile;
		if (!file.codeEditor) return;
		show(file);
		prevTab.click();
		var file_navigate = file.navigate;
		file.navigate = function(nav) {
			var _editor = $gmedit["Main"].aceEditor;
			$gmedit["Main"].aceEditor = editor;
			var result = file_navigate.apply(this, arguments);
			$gmedit["Main"].aceEditor = _editor;
			return result;
		};
		setTimeout(() => {
			for (let ttip of document.querySelectorAll('.ace_tooltip')) {
				ttip.style.display = "none";
			}
			editor.focus();
		}, 100);
	}
	window.PeekAside = {
		openWrap: openWrap
	};
	function init() {
		peekCommand = {
			name: "peekAside",
			bindKey: "Alt-F1|Alt-F12",
			exec: function(editor) {
				openWrap(() => {
					editor.commands.exec("openDeclaration", editor);
				}, editor);
			}
		};
		aceEditor.commands.addCommand(peekCommand);
	}
	//
	GMEdit.register("peek-aside", {
		init: init,
		cleanup: function() {
			hide();
		},
	});
})();
