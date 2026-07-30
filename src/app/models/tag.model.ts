export interface Tagger {
  name: string;
  email: string;
  date: string;
}

export interface CreateTagRequest {
  tag: string;
  message: string;
  object: string;   
  type: string;      
  tagger: Tagger;
}

export interface CreateTagResponse {
  node_id: string;
  tag: string;
  sha: string;
  url: string;
  message: string;
  tagger: Tagger;
  object: {
    type: string;
    sha: string;
    url: string;
  };
}