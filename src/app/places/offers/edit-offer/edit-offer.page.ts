import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NavController,
  LoadingController,
  AlertController
} from '@ionic/angular';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PlacesService } from '../../places.service';
import { PlaceLocation } from '../../location.model';
import { Place } from '../../place.model';

function base64toBlob(base64Data, contentType) {
  contentType = contentType || '';
  const sliceSize = 1024;
  const byteCharacters = window.atob(base64Data);
  const bytesLength = byteCharacters.length;
  const slicesCount = Math.ceil(bytesLength / sliceSize);
  const byteArrays = new Array(slicesCount);

  for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    const begin = sliceIndex * sliceSize;
    const end = Math.min(begin + sliceSize, bytesLength);

    const bytes = new Array(end - begin);
    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset].charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
}

@Component({
  selector: 'app-edit-offer',
  templateUrl: './edit-offer.page.html',
  styleUrls: ['./edit-offer.page.scss']
})
export class EditOfferPage implements OnInit, OnDestroy {
  place: Place;
  placeId: string;
  form: FormGroup;
  isLoading = false;
  private placeSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private placesService: PlacesService,
    private navCtrl: NavController,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      if (!paramMap.has('placeId')) {
        this.navCtrl.navigateBack('/places/tabs/offers');
        return;
      }
      this.placeId = paramMap.get('placeId');  // pristupanje ID-u smještaja u URL-u
      this.isLoading = true;
      this.placeSub = this.placesService
        .getPlace(paramMap.get('placeId'))
        .subscribe(
          place => {
            this.place = place;
            this.form = new FormGroup({
              title: new FormControl(this.place.title, {
                updateOn: 'blur',
                validators: [Validators.required]
              }),
              description: new FormControl(this.place.description, {
                updateOn: 'blur',
                validators: [Validators.required, Validators.maxLength(180)]
              }),
              price: new FormControl(this.place.price, {
                updateOn: 'blur',
                validators: [Validators.required]
              }),
              dateFrom: new FormControl(this.place.availableFrom.toISOString(), {
                updateOn: 'blur',
                validators: [Validators.required]
              }),
              dateTo: new FormControl(this.place.availableTo.toISOString(), {
                updateOn: 'blur',
                validators: [Validators.required]
              }),
              

            });

            this.isLoading = false;
          },
          error => {
            this.alertCtrl
              .create({
                header: 'Greška!',
                message: 'Smještaj ne može biti učitan, pokušajte ponovno',
                buttons: [
                  {
                    text: 'U redu',
                    handler: () => {
                      this.router.navigate(['/places/tabs/offers']);
                    }
                  }
                ]
              })
              .then(alertEl => {
                alertEl.present();
              });
          }
        );
    });
  }

  onLocationPicked(lokacija: PlaceLocation) {
    this.form.patchValue({ location: lokacija });
  }

  onImgPicked(imageData: string | File) {
    let imageFile;
    if (typeof imageData === 'string') {
      console.log('slika je u string formatu')
      try {
        const base64ContentArray = imageData.split(',');
        const mimeType = base64ContentArray[0].match(/[^:\s*]\w+\/[\w-+\d.]+(?=[;| ])/)[0];
        imageFile = base64toBlob(
          base64ContentArray[1],
          mimeType
        );
      } catch (error) {
        console.log(error);
        return;
      }
    } else {
      console.log('slika je u file formatu')
      imageFile = imageData;
    }
    this.form.patchValue({ image: imageFile });
  }

  onUpdateOffer() {
    if (!this.form.valid) {
      return;
    }
    this.loadingCtrl
      .create({
        message: 'Ažuriranje smještaja'
      })
      .then(loadingEl => {
        loadingEl.present();
        this.placesService
          .updatePlace(
            this.place.id,
            this.form.value.title,
            this.form.value.description,
            this.form.value.price,
            new Date(this.form.value.dateFrom),
            new Date(this.form.value.dateTo)
          )
          .subscribe(() => {
            loadingEl.dismiss();
            this.form.reset();
            this.router.navigate(['/places/tabs/offers']);
          });
      });
  }
  onDeleteOffer(placeId: string) {
    this.loadingCtrl.create({ message: 'Otkazivanje...' }).then(loadingEl => {
      loadingEl.present();
      console.log(placeId);
      this.placesService.deletePlace(placeId).subscribe(() => {
        loadingEl.dismiss();
        this.router.navigateByUrl('/places/tabs/offers');
      });
    });
  }

  ngOnDestroy() {
    if (this.placeSub) {
      this.placeSub.unsubscribe();
    }
  }
}
