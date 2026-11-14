import { Suspense } from "react";

import { Mission } from "./mission";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Mission />
    </Suspense>
  );
}
