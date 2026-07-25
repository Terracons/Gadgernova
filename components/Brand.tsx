import Link from "next/link";
import { store } from "@/store.config";

/**
 * Wordmark. Splits the store name at the last capital letter so
 * "GadgetNova" renders as Gadget + Nova in the accent colour. A single-word
 * name just renders plain.
 */
function splitName(name: string): [string, string] {
  const match = name.match(/^(.+?)([A-Z][a-z0-9]*)$/);
  if (!match || !match[1]) return [name, ""];
  return [match[1], match[2]];
}

export default function Brand({ href = "/" }: { href?: string }) {
  const [head, tail] = splitName(store.name);

  return (
    <Link href={href} className="logo" aria-label={`${store.name} home`}>
      {store.logo && <img src={store.logo} alt="" width={34} height={34} />}
      <span>
        {head}
        {tail && <em>{tail}</em>}
      </span>
    </Link>
  );
}
