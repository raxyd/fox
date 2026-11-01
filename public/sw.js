importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

/* ---------- Ad blocker ----------
   The on/off switch lives in Settings. The page stores it in the Cache API
   ("fox-settings") and also messages us, so it survives this worker restarting. */
const AD_HOSTS = [
	"doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com",
	"pagead2.googlesyndication.com", "google-analytics.com", "googletagmanager.com", "googletagservices.com",
	"amazon-adsystem.com", "adnxs.com", "adsrvr.org", "rubiconproject.com", "pubmatic.com", "openx.net",
	"criteo.com", "criteo.net", "taboola.com", "outbrain.com", "moatads.com", "scorecardresearch.com",
	"quantserve.com", "casalemedia.com", "advertising.com", "adcolony.com", "applovin.com", "smaato.net",
	"popads.net", "popcash.net", "propellerads.com", "exoclick.com", "juicyads.com", "adsterra.com",
	"mgid.com", "revcontent.com", "zedo.com", "serving-sys.com", "yieldmo.com", "2mdn.net",
];
const AD_RE = new RegExp(
	"(?:^|[/.@])(?:" + AD_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|") + ")(?=[/:?#&]|$)",
	"i"
);

let adblock = null;

async function adblockEnabled() {
	if (adblock === null) {
		try {
			const cache = await caches.open("fox-settings");
			const res = await cache.match("/__fox/adblock");
			adblock = res ? (await res.text()) === "1" : true;
		} catch {
			adblock = true;
		}
	}
	return adblock;
}

self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "adblock") adblock = !!event.data.on;
});

function isAd(url) {
	// the real destination is percent-encoded inside the proxied URL, so test it decoded
	let u = url;
	for (let i = 0; i < 2; i++) {
		try {
			const d = decodeURIComponent(u);
			if (d === u) break;
			u = d;
		} catch {
			break;
		}
	}
	return AD_RE.test(u);
}

function blocked(request) {
	const types = {
		script: "application/javascript",
		style: "text/css",
		image: "image/gif",
	};
	return new Response("", {
		status: 200,
		headers: { "content-type": types[request.destination] || "text/plain" },
	});
}

async function handleRequest(event) {
	await scramjet.loadConfig();
	if (scramjet.route(event)) {
		if ((await adblockEnabled()) && isAd(event.request.url)) {
			return blocked(event.request);
		}
		return scramjet.fetch(event);
	}
	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});