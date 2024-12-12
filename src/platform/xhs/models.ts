/**
 * class NoteUrlInfo(BaseModel):
    note_id: str = Field(title="note id")
    xsec_token: str = Field(title="xsec token")
    xsec_source: str = Field(title="xsec source")
 */

export interface NoteUrlInfo {
  note_id: string; // note id
  xsec_token: string; // xsec token
  xsec_source: string; // xsec source
}

/**
 * class FeedType(Enum):
    # 推荐
    RECOMMEND = "homefeed_recommend"
    # 穿搭
    FASION = "homefeed.fashion_v3"
    # 美食
    FOOD = "homefeed.food_v3"
    # 彩妆
    COSMETICS = "homefeed.cosmetics_v3"
    # 影视
    MOVIE = "homefeed.movie_and_tv_v3"
    # 职场
    CAREER = "homefeed.career_v3"
    # 情感
    EMOTION = "homefeed.love_v3"
    # 家居
    HOURSE = "homefeed.household_product_v3"
    # 游戏
    GAME = "homefeed.gaming_v3"
    # 旅行
    TRAVEL = "homefeed.travel_v3"
    # 健身
    FITNESS = "homefeed.fitness_v3"
*/
export enum FeedType {
  RECOMMEND = "homefeed_recommend",
  FASION = "homefeed.fashion_v3",
  FOOD = "homefeed.food_v3",
  COSMETICS = "homefeed.cosmetics_v3",
  MOVIE = "homefeed.movie_and_tv_v3",
  CAREER = "homefeed.career_v3",
  EMOTION = "homefeed.love_v3",
  HOURSE = "homefeed.household_product_v3",
  GAME = "homefeed.gaming_v3",
  TRAVEL = "homefeed.travel_v3",
  FITNESS = "homefeed.fitness_v3",
}

/**
 * 
class NoteType(Enum):
    NORMAL = "normal"
    VIDEO = "video"
*/
export enum NoteType {
  NORMAL = "normal",
  VIDEO = "video",
}

/**
 * 

class SearchSortType(Enum):
    """search sort type"""
    # default
    GENERAL = "general"
    # most popular
    MOST_POPULAR = "popularity_descending"
    # Latest
    LATEST = "time_descending"
*/
export enum SearchSortType {
  GENERAL = "general",
  MOST_POPULAR = "popularity_descending",
  LATEST = "time_descending",
}

/**
 * 

class SearchNoteType(Enum):
    """search note type
    """
    # default
    ALL = 0
    # only video
    VIDEO = 1
    # only image
    IMAGE = 2
*/
export enum SearchNoteType {
  ALL = 0,
  VIDEO = 1,
  IMAGE = 2,
}

/**
 * 

class Note(NamedTuple):
    """note tuple"""
    note_id: str
    title: str
    desc: str
    type: str
    user: dict
    img_urls: list
    video_url: str
    tag_list: list
    at_user_list: list
    collected_count: str
    comment_count: str
    liked_count: str
    share_count: str
    time: int
    last_update_time: int
 */
export interface Note {
  note_id: string;
  title: string;
  desc: string;
  type: string;
  user: any;
  img_urls: string[];
  video_url: string;
  tag_list: string[];
  at_user_list: string[];
  collected_count: string;
  comment_count: string;
  liked_count: string;
  share_count: string;
  time: number;
  last_update_time: number;
}
