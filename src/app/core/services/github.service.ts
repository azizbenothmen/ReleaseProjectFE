import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTagRequest, CreateTagResponse } from '../../models/tag.model';

export interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {

  private baseUrl = 'http://localhost:8085';

  constructor(private http: HttpClient) {}

  getBranches(owner: string, repo: string): Observable<Branch[]> {
    return this.http.get<Branch[]>(
      `${this.baseUrl}/repo/${repo}/${owner}/branches`
    );
  }

  getCommits(owner: string, repo: string, branch: string): Observable<Commit[]> {
    return this.http.get<Commit[]>(
      `${this.baseUrl}/repos/${owner}/${repo}/commits/${branch}`,
      { params: { sha: branch } }
    );
  }

  getBranchSha(owner: string, repo: string, branch: string): Observable<string> {
    return this.http.get(
      `${this.baseUrl}/repos/${owner}/${repo}/branches/${branch}`,
      { responseType: 'text' }
    );
  }

  createTag(owner: string, repo: string, branch: string, tag: CreateTagRequest,projectid:string): Observable<CreateTagResponse> {
    return this.http.post<CreateTagResponse>(
      `${this.baseUrl}/api/${owner}/${projectid}/${repo}/${branch}`,
      tag
    );
  }
}