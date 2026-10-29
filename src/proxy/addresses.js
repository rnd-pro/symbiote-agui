import { BlockList, isIP } from 'node:net';

let blocked = new BlockList();
// Conservative exclusions from the IANA special-purpose registries, including
// protocol anycast ranges. IPv6 is limited to ordinary global unicast space.
// https://www.iana.org/assignments/iana-ipv4-special-registry/
for (let [
  address,
  prefix,
] of Object.entries({
  '0.0.0.0': 8,
  '10.0.0.0': 8,
  '100.64.0.0': 10,
  '127.0.0.0': 8,
  '169.254.0.0': 16,
  '172.16.0.0': 12,
  '192.0.0.0': 24,
  '192.0.2.0': 24,
  '192.31.196.0': 24,
  '192.52.193.0': 24,
  '192.88.99.0': 24,
  '192.168.0.0': 16,
  '192.175.48.0': 24,
  '198.18.0.0': 15,
  '198.51.100.0': 24,
  '203.0.113.0': 24,
  '224.0.0.0': 4,
  '240.0.0.0': 4,
})) { blocked.addSubnet(address, prefix, 'ipv4'); }

let globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
// https://www.iana.org/assignments/iana-ipv6-special-registry/
for (let [
  address,
  prefix,
] of Object.entries({
  '2001::': 23,
  '2001:db8::': 32,
  '2002::': 16,
  '2620:4f:8000::': 48,
  '3fff::': 20,
})) { blocked.addSubnet(address, prefix, 'ipv6'); }

/** @param {string} address */
export function isPublicAddress(address) {
  let family = isIP(address);
  return family === 4 ? !blocked.check(address, 'ipv4')
    : family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}
