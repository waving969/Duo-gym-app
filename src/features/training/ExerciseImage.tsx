import { useState } from "react";
import { MUSCLES } from "../../../shared/types";
import type { Muscle } from "../../../shared/types";
import { exerciseImage } from "./useTraining";

export function ExerciseImage({ id, muscle, frame = 0, className = "" }: { id: string; muscle: Muscle; frame?: number; className?: string }) {
  const src = exerciseImage(id, frame);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`ex-img ex-img--empty ${className}`} aria-hidden>
        {MUSCLES[muscle].charAt(0)}
      </span>
    );
  }
  return <img className={`ex-img ${className}`} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
