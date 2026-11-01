"use strict";

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
let proxyFrame;

window.scramjetGo = async (url, container = document.getElementById("panel")) => {
	try {
		const destination = new URL(url);
		if (!["http:", "https:"].includes(destination.protocol)) {
			throw new Error("Only HTTP and HTTPS destinations are supported.");
		}
		if (!container) {
			throw new Error("The proxy destination container is unavailable.");
		}

		await registerSW();

		const wispUrl =
			(location.protocol === "https:" ? "wss" : "ws") +
			"://" +
			location.host +
			"/wisp/";
		if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
			await connection.setTransport("/libcurl/index.mjs", [
				{ websocket: wispUrl },
			]);
		}

		if (!proxyFrame) {
			proxyFrame = scramjet.createFrame();
			proxyFrame.frame.id = "sj-frame";
			proxyFrame.frame.style.cssText =
				"width:100%;height:100%;min-height:100%;border:0;display:block";
		}

		container.replaceChildren(proxyFrame.frame);
		proxyFrame.go(destination.toString());
	} catch (err) {
		const toast = document.getElementById("toast");
		if (toast) {
			toast.textContent = "Could not open page. Check the browser console.";
			toast.classList.add("s");
			setTimeout(() => toast.classList.remove("s"), 3000);
		}
		throw err;
	}
};

document.addEventListener("submit", async (event) => {
	const form = event.target.closest("#sj-form");
	if (!form) return;

	event.preventDefault();
	const address = form.querySelector("#sj-address");
	const searchEngine = form.querySelector("#sj-search-engine");

	try {
		await window.scramjetGo(search(address.value, searchEngine.value));
	} catch (err) {
		console.error("Scramjet search navigation failed:", err);
	}
});
