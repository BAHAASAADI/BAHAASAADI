import Image from "next/image";

/**
 * A generic smartphone drawn entirely in CSS (no photographs, no third-party
 * artwork): titanium-like frame, black glass, reflections and the iZone mark
 * on screen. Real stock photos are always used where they exist.
 */
export function DeviceVisual({
  className = "",
  photo,
  alt = "",
  tilt = 0,
}: {
  className?: string;
  photo?: string;
  alt?: string;
  tilt?: number;
}) {
  return (
    <div className={`relative aspect-[9/19] ${className}`} style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }} aria-hidden={photo ? undefined : true}>
      {/* frame */}
      <div
        className="absolute inset-0 rounded-[18%/8.5%] p-[3.2%]"
        style={{
          background: "linear-gradient(140deg, #d8d8d8 0%, #6f6f6f 18%, #2a2a2a 40%, #8d8d8d 62%, #3a3a3a 82%, #bdbdbd 100%)",
          boxShadow: "0 40px 90px -30px rgba(255,255,255,0.28), 0 0 0 1px rgba(255,255,255,0.12), inset 0 0 2px rgba(255,255,255,0.6)",
        }}
      >
        {/* glass */}
        <div className="relative h-full w-full overflow-hidden rounded-[15.5%/7.4%] bg-black" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.9)" }}>
          {photo ? (
            <Image src={photo} alt={alt} fill sizes="320px" className="object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 55% at 50% 45%, #1e1e1e 0%, #050505 70%)" }}>
              <div className="absolute inset-x-[16%] top-1/2 -translate-y-1/2">
                <Image src="/brand/izone-logo.png" alt="" width={1446} height={398} sizes="200px" className="h-auto w-full opacity-95" />
                <p className="mt-[8%] text-center text-[clamp(6px,0.9vw,9px)] tracking-[0.34em] text-white/70">ONLY APPLE PRODUCTS</p>
              </div>
            </div>
          )}
          {/* dynamic island */}
          <div className="absolute left-1/2 top-[2.6%] h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }} />
          {/* glass reflection */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 28%, transparent 42%)" }} />
        </div>
      </div>
      {/* side buttons */}
      <span className="absolute -left-[1.6%] top-[18%] h-[5%] w-[1.6%] rounded-l bg-gradient-to-b from-neutral-300 to-neutral-600" />
      <span className="absolute -left-[1.6%] top-[26%] h-[9%] w-[1.6%] rounded-l bg-gradient-to-b from-neutral-300 to-neutral-600" />
      <span className="absolute -right-[1.6%] top-[24%] h-[13%] w-[1.6%] rounded-r bg-gradient-to-b from-neutral-300 to-neutral-600" />
    </div>
  );
}
