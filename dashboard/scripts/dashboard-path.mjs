const path = (process.env.DASHBOARD_BASE_PATH ?? "/gmina-ozimek/").replace(/^\/+|\/+$/g, "");

export const dashboardBasePath = path ? `/${path}/` : "/";
