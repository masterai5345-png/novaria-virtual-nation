import VillageZeroPage from "./village-zero/page";

// Homepage publik langsung membuka dunia 3D, tanpa landing ataupun login.
// Berkas dunia Kota Maskot sebelumnya tetap tersedia di /kota-maskot-world.html.
export default function HomePage(){
  return <VillageZeroPage publicMode />;
}
