import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store';

export const useAppSelector = useSelector.withTypes<RootState>();
