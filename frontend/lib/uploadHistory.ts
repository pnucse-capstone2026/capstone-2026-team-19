import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImagePickerAsset } from 'expo-image-picker';

// 같은 스크린샷을 갤러리에서 실수로 두 번 골라도 서버엔 중복 방지 로직이
// 없어서(내용이 같아도 매번 새 이미지 레코드로 저장됨) 매번 새로 업로드돼
// 버린다 — 그래서 한 번 업로드된 사진을 기기에 기억해뒀다가, 다음에 같은
// 사진을 고르면 클라이언트에서 미리 걸러낸다.
const STORAGE_KEY = 'izzima.uploadedAssetKeys';

// 갤러리 asset의 고유 id(assetId)가 제일 정확한 식별자인데, 사진 접근 권한이
// "제한된 사진 허용"(Limited Access)이면 expo-image-picker 문서상 assetId가
// null로 온다 — 이 경우 파일 크기+가로세로 조합으로 대신 식별한다. 같은
// 스크린샷이면 크기/해상도가 완전히 같을 수밖에 없어서(다른 사진이 우연히
// 셋 다 일치할 확률은 사실상 0에 가까움) 완벽하진 않아도 충분히 쓸만한
// 대체 수단. 그것마저 없으면(둘 다 unavailable) 중복 체크를 포기하고 null.
export function getAssetDedupeKey(asset: ImagePickerAsset): string | null {
  if (asset.assetId) return `id:${asset.assetId}`;
  if (asset.fileSize) return `sig:${asset.fileSize}:${asset.width}:${asset.height}`;
  return null;
}

export async function getUploadedAssetKeys(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export async function markAssetsUploaded(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const existing = await getUploadedAssetKeys();
  keys.forEach((key) => existing.add(key));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(existing)));
}
