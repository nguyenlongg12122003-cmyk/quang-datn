import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined })
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[60vh] place-items-center px-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Đã có lỗi xảy ra</h1>
            <p className="text-sm text-muted-foreground">
              {this.state.message ?? 'Vui lòng tải lại trang hoặc quay về trang chủ.'}
            </p>
            <Button onClick={this.handleReset}>Về trang chủ</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
