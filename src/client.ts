const API_BASE_URL = "https://togello.api.toru-takagi.dev";

type FetchServerProps = {
  path: string;
};

type PostServerProps<T> = FetchServerProps & {
  body: T;
};

type HttpClient = {
  fetchURL: <T>(props: FetchServerProps) => Promise<T>;
  postJson: <T, U>(props: PostServerProps<U>) => Promise<T>;
  putJson: <T, U>(props: PostServerProps<U>) => Promise<T>;
};

export const httpClient: HttpClient = {
  fetchURL: async <T>({ path }: FetchServerProps): Promise<T> => {
    const token = process.env.TOGELLO_API_TOKEN;
    if (!token) {
      throw new Error("environment variable TOGELLO_API_TOKEN is not set");
    }

    const url = `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`response status: ${response.status}`);
    }

    return (await response.json()) as T;
  },

  postJson: async <T, U>({ path, body }: PostServerProps<U>): Promise<T> => {
    const token = process.env.TOGELLO_API_TOKEN;
    if (!token) {
      throw new Error("environment variable TOGELLO_API_TOKEN is not set");
    }

    const url = `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`response status: ${response.status}`);
    }

    return (await response.json()) as T;
  },

  putJson: async <T, U>({ path, body }: PostServerProps<U>): Promise<T> => {
    const token = process.env.TOGELLO_API_TOKEN;
    if (!token) {
      throw new Error("environment variable TOGELLO_API_TOKEN is not set");
    }

    const url = `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`response status: ${response.status}`);
    }

    return (await response.json()) as T;
  },
};
