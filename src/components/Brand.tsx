import logo from '../assets/logo.webp'

export default function Brand({ subtitle }: { subtitle: string }) {
  return <><img className="brand-logo" src={logo} alt="La Risacca 2" width={900} height={153} /><small>{subtitle}</small></>
}
