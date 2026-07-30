import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TagFormComponent } from './features/github-tag/tag-form/tag-form.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TagFormComponent,ReactiveFormsModule,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Front');
}
