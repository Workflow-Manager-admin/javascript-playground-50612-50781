import { render, screen } from '@testing-library/react';
import App from './App';

test('renders navbar and code editor', () => {
  render(<App />);
  expect(screen.getByText(/JS Playground/i)).toBeInTheDocument();
  expect(screen.getByText(/JavaScript Editor/i)).toBeInTheDocument();
  expect(screen.getByText(/Result \/ Output/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
});
