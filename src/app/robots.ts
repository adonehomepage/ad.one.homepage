export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/login", "/invite", "/preview"] }],
  };
}
