import type {
  BeanBalanceDto,
  BehaviorTagDto,
  CheckInDto,
  MergeEvent,
  MonthSummaryDto,
  ProfileDto,
  RewardDto,
  RedemptionDto,
} from '@guoguo/shared';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `请求失败 (${res.status})`);
  }
  return data as T;
}

export type MeResponse = {
  user: { id: string; email: string; name: string };
  familyId: string;
  familyName: string;
  profiles: ProfileDto[];
};

export const api = {
  register: (body: {
    email: string;
    password: string;
    name: string;
    familyName?: string;
    profileName?: string;
  }) => request<MeResponse & { profile: ProfileDto }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ user: MeResponse['user']; familyId: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<MeResponse>('/api/auth/me'),

  profiles: {
    list: () => request<ProfileDto[]>('/api/profiles'),
    create: (body: { name: string; avatarColor?: string }) =>
      request<ProfileDto>('/api/profiles', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Pick<ProfileDto, 'name' | 'avatarColor' | 'sortOrder'>>) =>
      request<ProfileDto>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/profiles/${id}`, { method: 'DELETE' }),
  },

  tags: {
    list: (profileId: string) => request<BehaviorTagDto[]>(`/api/tags?profileId=${profileId}`),
    create: (body: { profileId: string; name: string; color: string; beansOnComplete: number }) =>
      request<BehaviorTagDto>('/api/tags', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<BehaviorTagDto>) =>
      request<BehaviorTagDto>(`/api/tags/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/tags/${id}`, { method: 'DELETE' }),
  },

  checkIns: {
    list: (profileId: string, month: string) =>
      request<CheckInDto[]>(`/api/checkins?profileId=${profileId}&month=${month}`),
    add: (body: { profileId: string; tagId: string; date: string }) =>
      request<{
        checkIn: CheckInDto;
        beans: BeanBalanceDto;
        mergeEvents: MergeEvent[];
      }>('/api/checkins', { method: 'POST', body: JSON.stringify(body) }),
    decrement: (body: { profileId: string; tagId: string; date: string }) =>
      request<{
        checkIn: CheckInDto | null;
        beans: BeanBalanceDto;
        mergeEvents: MergeEvent[];
      }>('/api/checkins/decrement', { method: 'POST', body: JSON.stringify(body) }),
  },

  beans: {
    get: (profileId: string) => request<BeanBalanceDto>(`/api/beans?profileId=${profileId}`),
  },

  rewards: {
    list: (profileId: string) => request<RewardDto[]>(`/api/rewards?profileId=${profileId}`),
    create: (body: {
      profileId: string;
      title: string;
      costSmall: number;
      costBig: number;
      photoUrl?: string | null;
    }) => request<RewardDto>('/api/rewards', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<RewardDto>) =>
      request<RewardDto>(`/api/rewards/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/rewards/${id}`, { method: 'DELETE' }),
    redeem: (id: string) =>
      request<{ redemption: RedemptionDto; beans: BeanBalanceDto }>(`/api/rewards/${id}/redeem`, {
        method: 'POST',
      }),
  },

  summary: (profileId: string, month: string) =>
    request<MonthSummaryDto>(`/api/summary?profileId=${profileId}&month=${month}`),

  upload: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/api/uploads', { method: 'POST', body: form });
  },
};
