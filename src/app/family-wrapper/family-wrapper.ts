import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-family-wrapper',
  imports: [RouterModule, FormsModule],
  templateUrl: './family-wrapper.html',
  styleUrl: './family-wrapper.scss',
})
export class FamilyWrapper {
  currentTreeId: string | null = null;
  constructor(private router: Router) {}

  onSelectChange(event: any) {
    this.router.navigate(['/tree', this.currentTreeId]);
  }
}
