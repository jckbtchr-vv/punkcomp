import Link from "next/link";

export const metadata = {
  title: "What is Opepen? | PVP",
  description: "Learn about Opepen Edition, a collaborative art experiment by Jack Butcher",
};

export default function AboutOpepenPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="max-w-xl w-full">
        {/* Back link */}
        <Link
          href="/opepen"
          className="inline-block mb-8 font-mono-caps text-[10px] text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          &larr; BACK TO VOTING
        </Link>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          What is Opepen?
        </h1>

        {/* Content */}
        <div className="space-y-6 text-neutral-300 leading-relaxed">
          <p>
            <strong className="text-white">Opepen Edition</strong> is a collaborative art experiment created by{" "}
            <a
              href="https://twitter.com/jackbutcher"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300"
            >
              Jack Butcher
            </a>
            .
          </p>

          <p>
            The collection consists of <strong className="text-white">16,000 tokens</strong> on Ethereum,
            divided into 200 &ldquo;sets&rdquo; that are revealed through a unique opt-in mechanism.
          </p>

          <div className="border-l-2 border-neutral-700 pl-4 my-8">
            <p className="text-neutral-400 italic">
              &ldquo;Opepen is an experiment in digital collecting, community curation,
              and collaborative art creation.&rdquo;
            </p>
          </div>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">How it works</h2>

          <ul className="space-y-3 text-neutral-400">
            <li className="flex gap-3">
              <span className="text-green-500 font-mono">1.</span>
              <span>Artists submit artwork for consideration</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-500 font-mono">2.</span>
              <span>Collectors vote on which sets get revealed</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-500 font-mono">3.</span>
              <span>Opted-in tokens transform into the winning artwork</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-500 font-mono">4.</span>
              <span>Each set has editions of 1, 4, 5, 10, 20, and 40</span>
            </li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">Edition sizes</h2>

          <div className="grid grid-cols-3 gap-3 text-center font-mono-caps text-xs">
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">1/1</div>
              <div className="text-neutral-500">Unique</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">1/4</div>
              <div className="text-neutral-500">Rare</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">1/5</div>
              <div className="text-neutral-500">Scarce</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">1/10</div>
              <div className="text-neutral-500">Limited</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">1/20</div>
              <div className="text-neutral-500">Standard</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-green-400 text-lg font-bold">1/40</div>
              <div className="text-neutral-500">Common</div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">About PVP</h2>

          <p>
            This site lets you vote on which Opepen artwork you prefer.
            Your votes contribute to an <strong className="text-white">ELO ranking system</strong> that
            surfaces the community&apos;s aesthetic preferences.
          </p>

          <p className="text-neutral-500">
            View the{" "}
            <Link href="/opepen/leaderboard" className="text-green-400 hover:text-green-300">
              leaderboard
            </Link>{" "}
            to see top-rated Opepen, sets, and collectors.
          </p>
        </div>

        {/* Links */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <h3 className="font-mono-caps text-xs text-neutral-500 mb-4">LEARN MORE</h3>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://opepen.art"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-caps text-xs text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
            >
              OPEPEN.ART
            </a>
            <a
              href="https://opensea.io/collection/opepen-edition"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-caps text-xs text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
            >
              OPENSEA
            </a>
            <a
              href="https://twitter.com/opaborhood"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-caps text-xs text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-lg transition-colors"
            >
              @OPEPENHOOD
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
