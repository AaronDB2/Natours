/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  try {
    const stripe = Stripe(
      'pk_test_51MHqleFJNeyGDWXEnLik6edWGZ91NgAGgJvsLb5b7C3UxmBwBAWFyVx2QmNq2qoPe0WR7msINaky1huHkdJ9KjOF00hO5LRQkJ'
    );
    // Get checkout session from API
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    // Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
