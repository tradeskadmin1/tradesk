import Image from "next/image"

export default function Footer() {

    const footerLinks = [
        {
            heading: "Protocol",
            links: ["Trade", "Liquidity Pools", "Governance", "TRSK Token", "Staking"],
        },
        {
            heading: "Developers",
            links: ["Documentation", "Smart Contracts", "SDK / API", "GitHub", "Bug Bounty"],
        },
        {
            heading: "Community",
            links: ["Discord", "Twitter / X", "Mirror Blog", "Snapshot", "Brand Kit"],
        },
    ];


    return (
        <footer className="w-full bg-[#080b10] border-t border-white/8 px-[5%] pt-16 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
                <div className="col-span-1">
                    <div className="flex items-center gap-3 mb-4">
                        <Image src='/logo.png' alt="logo" width={50} height={50} />
                        <span className="font-display text-[20px] font-bold text-white">
                            Trade<span className="text-[#FF5733]">sk</span>
                        </span>
                    </div>
                    <p className="font-mono text-[13px] text-[#6b7a8d] leading-[1.7] max-w-55">
                        Decentralized trading infrastructure for the next generation of on-chain markets.
                    </p>
                    <div className="inline-flex items-center gap-2 mt-5 bg-[#FF5733]/6 border border-[#FF5733]/20 rounded-md px-3 py-1.5">
                        <span className="text-[#FF5733] text-[11px]">✓</span>
                        <span className="font-mono text-[11px] text-[#FF5733]">
                            Audited by Trail of Bits
                        </span>
                    </div>
                </div>
                {footerLinks.map((col) => (
                    <div key={col.heading}>
                        <h4 className="font-mono text-[11px] tracking-[0.15em] text-[#6b7a8d] uppercase mb-4">
                            {col.heading}
                        </h4>
                        <ul className="flex flex-col gap-2.5">
                            {col.links.map((link) => (
                                <li key={link}>
                                    <a
                                        href="#"
                                        className="font-sans text-[14px] text-[#6b7a8d] hover:text-white transition-colors duration-200"
                                    >
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-7 border-t border-white/8">
                <span className="font-mono text-[12px] text-[#6b7a8d]">
                    © {new Date().getFullYear()} Tradesk Protocol. Non-custodial. No warranties.
                </span>
                <div className="flex items-center gap-6">
                    {["Terms", "Privacy", "Security"].map((item) => (
                        <a
                            key={item}
                            href="#"
                            className="font-mono text-[12px] text-[#6b7a8d] hover:text-white transition-colors duration-200"
                        >
                            {item}
                        </a>
                    ))}
                </div>
            </div>
        </footer>

    )
}