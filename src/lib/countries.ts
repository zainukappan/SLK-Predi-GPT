export const countryCodes = [
  ["IN", "+91"], ["AE", "+971"], ["QA", "+974"], ["SA", "+966"], ["KW", "+965"],
  ["OM", "+968"], ["BH", "+973"], ["US/CA", "+1"], ["GB", "+44"], ["AU", "+61"],
  ["SG", "+65"], ["MY", "+60"], ["DE", "+49"], ["FR", "+33"], ["IT", "+39"],
  ["ES", "+34"], ["NL", "+31"], ["IE", "+353"], ["NZ", "+64"], ["PK", "+92"],
] as const;

export function splitPhone(value: string) {
  const code = [...countryCodes]
    .map((item) => item[1])
    .sort((a, b) => b.length - a.length)
    .find((item) => value.startsWith(item)) ?? "+91";
  return {
    code,
    number: value.startsWith(code) ? value.slice(code.length) : value.replace(/^\+/, ""),
  };
}
