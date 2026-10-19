import * as profileController from "../controllers/profile.controller.js";
import * as accountController from "../controllers/account.controller.js";

export async function handleProfileRoutes(method, route, body, query, event) {
  if (method === "GET" && route === "/profile")
    return profileController.getProfile(query, event);

  if (method === "GET" && route === "/profile/orders")
    return profileController.getUserOrders(query, event);

  if (method === "POST" && route === "/profile/update")
    return profileController.updateProfile(body, event);

  if (method === "POST" && route === "/profile/email/send-otp")
    return profileController.sendEmailOtp(body, event);

  if (method === "POST" && route === "/profile/email/verify-otp")
    return profileController.verifyEmailOtp(body, event);

  if (method === "POST" && route === "/user/style-profile")
    return profileController.saveStyleProfile(body, event);

  if (method === "GET" && route === "/user/style-profile")
    return profileController.getStyleProfile(query, event);

  if (method === "DELETE" && route === "/user/style-profile")
    return profileController.clearStyleProfile(body, event);

  // Saved addresses
  if (method === "GET" && route === "/profile/addresses")
    return profileController.listAddresses(query, event);

  if (method === "POST" && route === "/profile/addresses")
    return profileController.createAddress(body, event);

  const addressMatch = route.match(/^\/profile\/addresses\/([0-9a-f-]{36})$/i);
  if (addressMatch && method === "PUT")
    return profileController.updateAddress(addressMatch[1], body, event);
  if (addressMatch && method === "DELETE")
    return profileController.deleteAddress(addressMatch[1], event);

  // The account page (The Den): membership, fit feedback, restock alerts, notification choices
  if (method === "GET" && route === "/profile/membership")
    return accountController.getMembership(query, event);

  const fitMatch = route.match(/^\/profile\/orders\/([0-9a-f-]{36})\/items\/([0-9a-f-]{36})\/fit$/i);
  if (fitMatch && method === "POST")
    return accountController.setFitFeedback(fitMatch[1], fitMatch[2], body, event);

  if (method === "GET" && route === "/profile/restock-alerts")
    return accountController.listRestockAlerts(query, event);
  if (method === "POST" && route === "/profile/restock-alerts")
    return accountController.createRestockAlert(body, event);
  const alertMatch = route.match(/^\/profile\/restock-alerts\/([0-9a-f-]{36})$/i);
  if (alertMatch && method === "DELETE")
    return accountController.deleteRestockAlert(alertMatch[1], event);

  if (method === "GET" && route === "/profile/notifications")
    return accountController.getNotificationPrefs(query, event);
  if (method === "PUT" && route === "/profile/notifications")
    return accountController.updateNotificationPrefs(body, event);

  // Delete account (body: { confirm: "DELETE" })
  if (method === "POST" && route === "/profile/delete")
    return profileController.deleteAccount(body, event);

  return null;
}
