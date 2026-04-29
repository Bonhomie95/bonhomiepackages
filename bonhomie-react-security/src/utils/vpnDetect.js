export async function detectVPN() {
  let pc;
  try {
    pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        // Always close the peer connection to avoid leaking the underlying
        // native handle — without this, every call leaves an open RTCPeerConnection.
        try { pc.close(); } catch {}
        resolve(result);
      };

      // Timeout: if no useful candidate arrives within 3 s, give up cleanly.
      const timeout = setTimeout(() => {
        finish({ ip: null, suspicious: false });
      }, 3000);

      pc.onicecandidate = (e) => {
        if (!e || !e.candidate) return;

        const ip = e.candidate.address || e.candidate.relatedAddress;
        if (!ip) return;

        // We only need the first usable candidate — clear the timeout and
        // stop listening so subsequent candidates don't fire extra fetches.
        clearTimeout(timeout);
        pc.onicecandidate = null;

        const dcPatterns = ['amazonaws', 'google', 'digitalocean', 'ovh'];
        fetch(`https://ipapi.co/${ip}/json/`)
          .then((res) => res.json())
          .then((data) => {
            const org = (data?.org || '').toLowerCase();
            const suspicious = dcPatterns.some((p) => org.includes(p));
            finish({ ip, suspicious, org });
          })
          .catch(() => finish({ ip, suspicious: false }));
      };
    });
  } catch {
    try { pc?.close(); } catch {}
    return { ip: null, suspicious: false };
  }
}
