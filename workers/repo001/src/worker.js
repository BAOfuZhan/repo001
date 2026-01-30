export default {
  async scheduled(event, env, ctx) {
    const enabled = await env.cron_enabled.get("status");
    if (enabled === "false") {
      console.log("⏸ Cron paused");
      return;
    }

    console.log("▶️ Cron active, triggering GitHub");

    const url = "https://api.github.com/repos/BAOfuZhan/repo001/dispatches";

    ctx.waitUntil(
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `token ${env.GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "cloudflare-worker-cron",
        },
        body: JSON.stringify({
          event_type: "cron",
        }),
      })
        .then(async (resp) => {
          if (!resp.ok) {
            const text = await resp.text();
            console.error("GitHub failed:", resp.status, text);
          } else {
            console.log("✅ GitHub triggered:", resp.status);
          }
        })
        .catch((err) => {
          console.error("❌ GitHub fetch error:", err);
        })
    );
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const key = url.searchParams.get("key");

    if (!key || key !== env.API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, reason: "Unauthorized" }),
        { status: 401 }
      );
    }

    if (action === "pause") {
      await env.cron_enabled.put("status", "false");
      return Response.json({ ok: true, status: "paused" });
    }

    if (action === "resume") {
      await env.cron_enabled.put("status", "true");
      return Response.json({ ok: true, status: "resumed" });
    }

    if (action === "status") {
      const v = await env.cron_enabled.get("status");
      return Response.json({ ok: true, enabled: v !== "false" });
    }

    return new Response(
      JSON.stringify({ ok: false, reason: "Invalid action" }),
      { status: 400 }
    );
  },
};
